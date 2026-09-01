import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export type CallState =
  | 'idle'
  | 'calling'      // we are calling someone
  | 'incoming'     // someone is calling us
  | 'connected'    // call is live
  | 'ended';

export interface IncomingCallInfo {
  from: string;
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRTC(socket: Socket | null, currentUserId: string) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [remoteUserId, setRemoteUserId] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    setRemoteUserId('');
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [localStream]);

  // ── Create peer connection ───────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
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
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanup();
        }
      };

      return pc;
    },
    [socket, cleanup]
  );

  // ── Start a call ─────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (
      targetUserId: string,
      type: 'audio' | 'video',
      callerName: string,
      callerAvatar: string
    ) => {
      if (!socket || callState !== 'idle') return;
      setCallType(type);
      setRemoteUserId(targetUserId);
      setCallState('calling');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        setLocalStream(stream);

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
      } catch (err) {
        console.error('Failed to start call:', err);
        cleanup();
      }
    },
    [socket, callState, createPeerConnection, cleanup]
  );

  // ── Answer a call ────────────────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    const { from, offer, callType: type } = incomingCall;
    setCallType(type);
    setRemoteUserId(from);
    setCallState('connected');
    setIncomingCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);

      const pc = createPeerConnection(from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', { to: from, answer });

      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('Failed to answer call:', err);
      cleanup();
    }
  }, [socket, incomingCall, createPeerConnection, cleanup]);

  // ── Reject a call ─────────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
    setCallState('idle');
  }, [socket, incomingCall]);

  // ── End a call ────────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (socket && remoteUserId) {
      socket.emit('call:end', { to: remoteUserId });
    }
    cleanup();
  }, [socket, remoteUserId, cleanup]);

  // ── Mute/unmute ───────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, [localStream]);

  // ── Toggle camera ─────────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((c) => !c);
  }, [localStream]);

  // ── Socket event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    socket.on('call:incoming', (data: IncomingCallInfo) => {
      if (callState !== 'idle') {
        // Already in a call — auto-reject
        socket.emit('call:reject', { to: data.from });
        return;
      }
      setIncomingCall(data);
      setCallState('incoming');
    });

    // Call answered by remote
    socket.on('call:answered', async ({ answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState('connected');
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    });

    // ICE candidate from remote
    socket.on('call:ice', async ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE error', e);
      }
    });

    // Remote ended the call
    socket.on('call:ended', () => {
      cleanup();
    });

    // Remote rejected
    socket.on('call:rejected', () => {
      cleanup();
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:ice');
      socket.off('call:ended');
      socket.off('call:rejected');
    };
  }, [socket, callState, cleanup]);

  return {
    callState,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isCamOff,
    callDuration,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}