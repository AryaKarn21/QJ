import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export type CallState =
  | 'idle'
  | 'calling'      // we are calling someone
  | 'incoming'     // someone is calling us
  | 'connected'    // call is live
  | 'failed'       // just ended abnormally (no answer, permission denied, connection lost, rejected…) — shows `error` briefly, then auto-returns to idle
  | 'ended';

export interface IncomingCallInfo {
  from: string;
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Optional TURN support, env-driven so no credentials are ever hardcoded.
// STUN alone is enough on most home/office networks (it only helps peers
// discover their public address), but it can't relay media through a
// symmetric NAT or a restrictive corporate firewall — a TURN server acts as
// a relay for exactly those cases. Unset in local dev, recommended for
// production:
//   VITE_TURN_URL=turn:turn.example.com:3478,turns:turn.example.com:5349
//   VITE_TURN_USERNAME=...
//   VITE_TURN_CREDENTIAL=...
function buildIceServers(): RTCIceServer[] {
  const servers = [...STUN_SERVERS];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    const urls = turnUrl.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length) {
      servers.push({
        urls,
        username: (import.meta.env.VITE_TURN_USERNAME as string | undefined) || undefined,
        credential: (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) || undefined,
      });
    }
  }
  return servers;
}

// How long an outgoing call rings before we give up — without this, an
// unanswered call (callee offline, app crashed, notification never arrived)
// left the caller staring at "Calling…" forever with an open microphone.
const CALL_TIMEOUT_MS = 45000;
// A 'disconnected' RTCPeerConnection can recover on its own (a brief network
// blip); only tear the call down if it hasn't recovered after this long.
// 'failed' (unrecoverable) still ends the call immediately.
const DISCONNECT_GRACE_MS = 4000;
// How long the UI shows the `error` reason (busy/declined/no-answer/denied)
// before the hook resets to 'idle' for the next call.
const FAILURE_DISPLAY_MS = 3000;

function friendlyMediaError(err: unknown, type: 'audio' | 'video'): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return type === 'video'
      ? 'Camera/microphone access was denied. Allow access in your browser settings to make video calls.'
      : 'Microphone access was denied. Allow access in your browser settings to make calls.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return type === 'video'
      ? 'No camera or microphone was found on this device.'
      : 'No microphone was found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera or microphone is already in use by another application.';
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not support voice/video calls.';
  }
  return 'Could not access your camera/microphone. Please try again.';
}

export function useWebRTC(socket: Socket | null, currentUserId: string) {
  void currentUserId; // kept in the signature for API stability; not needed internally

  const [callState, setCallStateState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStreamState] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Refs mirror the mutable "instance" state that WebRTC callbacks need to
  // read from *whatever handler fires later, regardless of which render
  // created that handler*. Using React state directly inside cleanup/event
  // handlers (the previous implementation) meant those closures captured
  // whatever the state was AT THE TIME the callback was created, not at the
  // time it actually runs — e.g. `cleanup` could end up stopping the
  // previous call's stream (or nothing) instead of the live one.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = useRef<CallState>('idle');
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<string>('');
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const setCallState = useCallback((s: CallState) => {
    callStateRef.current = s;
    setCallStateState(s);
  }, []);

  const setLocalStream = useCallback((s: MediaStream | null) => {
    localStreamRef.current = s;
    setLocalStreamState(s);
  }, []);

  const setRemoteStream = useCallback((s: MediaStream | null) => {
    setRemoteStreamState(s);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (failureResetRef.current) { clearTimeout(failureResetRef.current); failureResetRef.current = null; }
  }, []);

  const startDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, []);

  // ── Cleanup — a clean, non-error end of the call (hangup, remote hangup,
  // decline). Always acts on the ACTUAL current refs, never a stale value.
  const cleanup = useCallback(() => {
    clearTimers();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];
    remoteUserIdRef.current = '';
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
  }, [clearTimers, setLocalStream, setRemoteStream, setCallState]);

  // Same teardown, but leaves a user-facing reason on screen for a moment
  // (via the 'failed' state + `error`) instead of silently snapping back to
  // idle — used for no-answer, rejection, permission/device errors, and a
  // broken peer connection, so nobody is left wondering what happened.
  const failCall = useCallback((message: string) => {
    setError(message);
    clearTimers();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];
    remoteUserIdRef.current = '';
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
    setCallState('failed');
    failureResetRef.current = setTimeout(() => {
      if (callStateRef.current === 'failed') setCallState('idle');
    }, FAILURE_DISPLAY_MS);
  }, [clearTimers, setLocalStream, setRemoteStream, setCallState]);

  const dismissError = useCallback(() => {
    setError(null);
    if (callStateRef.current === 'failed') {
      if (failureResetRef.current) { clearTimeout(failureResetRef.current); failureResetRef.current = null; }
      setCallState('idle');
    }
  }, [setCallState]);

  // cleanup/failCall are stable (all their deps are themselves stable), but
  // route unmount through a ref anyway so the effect below never needs
  // `cleanup` in its dependency array.
  const cleanupRef = useRef(cleanup);
  useEffect(() => { cleanupRef.current = cleanup; }, [cleanup]);

  // Unmount safety net: if the component using this hook goes away mid-call
  // (e.g. navigating off /messages), release the camera/mic and close the
  // peer connection instead of leaking them — a live camera/mic after
  // leaving the page is both a resource leak and a privacy problem.
  useEffect(() => () => cleanupRef.current(), []);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn('ICE error (flush)', e); }
    }
  }, []);

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit('call:ice', { to: targetUserId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          if (pcRef.current === pc) failCall('The call connection failed.');
        } else if (pc.connectionState === 'disconnected') {
          // Transient network blips often self-heal — don't tear the call
          // down immediately, only if it's still disconnected after a
          // grace period (and only if this is still the live connection).
          setTimeout(() => {
            if (pcRef.current === pc && pc.connectionState === 'disconnected') {
              failCall('The call connection was lost.');
            }
          }, DISCONNECT_GRACE_MS);
        }
      };

      return pc;
    },
    [socket, setRemoteStream, failCall]
  );

  // ── Start a call ─────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (
      targetUserId: string,
      type: 'audio' | 'video',
      callerName: string,
      callerAvatar: string
    ) => {
      if (!socket || callStateRef.current !== 'idle') return;
      setError(null);
      setCallType(type);
      remoteUserIdRef.current = targetUserId;
      setCallState('calling');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
      } catch (err) {
        console.error('Failed to get local media:', err);
        failCall(friendlyMediaError(err, type));
        return;
      }
      // The user may have hung up (or another call may have started) while
      // the permission prompt was open — don't proceed with a call nobody
      // asked for anymore.
      if (callStateRef.current !== 'calling') {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      setLocalStream(stream);

      try {
        const pc = createPeerConnection(targetUserId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
          to: targetUserId,
          offer,
          callType: type,
          callerName,
          callerAvatar,
        });

        callTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === 'calling') {
            socket.emit('call:end', { to: targetUserId });
            failCall('No answer.');
          }
        }, CALL_TIMEOUT_MS);
      } catch (err) {
        console.error('Failed to start call:', err);
        failCall('Could not start the call. Please try again.');
      }
    },
    [socket, createPeerConnection, failCall, setLocalStream, setCallState]
  );

  // ── Answer a call ────────────────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    const { from, offer, callType: type } = incomingCall;
    setError(null);
    setCallType(type);
    remoteUserIdRef.current = from;
    setIncomingCall(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
    } catch (err) {
      console.error('Failed to get local media:', err);
      socket.emit('call:reject', { to: from });
      failCall(friendlyMediaError(err, type));
      return;
    }
    if (callStateRef.current !== 'incoming' || remoteUserIdRef.current !== from) {
      // Caller hung up (or something else changed state) while the
      // permission prompt was open.
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    setLocalStream(stream);

    try {
      const pc = createPeerConnection(from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', { to: from, answer });

      setCallState('connected');
      startDurationTimer();
    } catch (err) {
      console.error('Failed to answer call:', err);
      failCall('Could not answer the call.');
    }
  }, [socket, incomingCall, createPeerConnection, flushPendingIce, failCall, setLocalStream, setCallState, startDurationTimer]);

  // ── Reject a call ─────────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
    setCallState('idle');
  }, [socket, incomingCall, setCallState]);

  // ── End a call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (socket && remoteUserIdRef.current) {
      socket.emit('call:end', { to: remoteUserIdRef.current });
    }
    cleanup();
  }, [socket, cleanup]);

  // ── Mute/unmute ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((c) => !c);
  }, []);

  // ── Socket event listeners — registered exactly ONCE per socket instance
  // (not re-subscribed on every callState change like the previous
  // implementation), reading `callStateRef.current` for freshness instead.
  // That old re-subscribe-per-state-change pattern also called
  // `socket.off(eventName)` with no handler argument, which removes *every*
  // listener for that event name on the socket — harmless only because
  // nothing else happened to register one; here each handler is a named
  // reference so `off` only ever removes exactly the one this effect added. ──
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: IncomingCallInfo) => {
      if (callStateRef.current !== 'idle') {
        // Already on a call — auto-decline instead of leaving the caller's
        // client waiting with no response at all.
        socket.emit('call:reject', { to: data.from });
        return;
      }
      setError(null);
      setIncomingCall(data);
      setCallState('incoming');
    };

    const onAnswered = async ({ answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce();
        setCallState('connected');
        startDurationTimer();
      } catch (err) {
        console.error('Failed to apply remote answer:', err);
        failCall('Could not connect the call.');
      }
    };

    const onIce = async ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        // The remote description (offer/answer) may not be applied yet —
        // ICE candidates can legitimately arrive before that point, so
        // queue them and flush once setRemoteDescription resolves instead
        // of dropping them (the previous implementation just discarded
        // any candidate that arrived too early via the `!pcRef.current`
        // guard, which could leave a call unable to find a media path).
        pendingIceRef.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn('ICE error', e); }
    };

    const onEnded = () => cleanupRef.current();
    const onRejected = () => failCall('Call declined.');
    const onCallError = (data: { reason?: string }) => failCall(data?.reason || "Couldn't place the call.");

    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice', onIce);
    socket.on('call:ended', onEnded);
    socket.on('call:rejected', onRejected);
    socket.on('call:error', onCallError);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice', onIce);
      socket.off('call:ended', onEnded);
      socket.off('call:rejected', onRejected);
      socket.off('call:error', onCallError);
    };
  }, [socket, flushPendingIce, failCall, setCallState, startDurationTimer]);

  return {
    callState,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCamOff,
    callDuration,
    error,
    dismissError,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
