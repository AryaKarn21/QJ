import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useCurrentUser } from '../utils/currentUser';
import { useWebRTC, type CallState, type IncomingCallInfo, type CallEndedInfo } from '../components/messaging/useWebRTC';
import { CallOverlay } from '../components/messaging/CallOverlay';
import { logCall, openConversationWith } from '../api/messageApi';


interface CallContextValue {
  callState: CallState;
  callType: 'audio' | 'video';
  incomingCall: IncomingCallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCamOff: boolean;
  callDuration: number;
  error: string | null;
  canSwitchCamera: boolean;
  startCall: (peerId: string, type: 'audio' | 'video', peerName: string, peerAvatar?: string) => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  dismissError: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// Web Audio API synthesizer for incoming ringtone & outgoing ringback
class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  startRingtone(type: 'incoming' | 'outgoing') {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'incoming' ? 659.25 : 440, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (type === 'incoming' ? 1.2 : 1.5));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + (type === 'incoming' ? 1.2 : 1.5));
      };

      playBeep();
      this.intervalId = setInterval(playBeep, type === 'incoming' ? 2500 : 3500);
    } catch {
      // Autoplay policy or no audio device
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

const ringtone = new RingtonePlayer();

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const { userId } = useCurrentUser();

  const handleCallEnded = async (info: CallEndedInfo) => {
    try {
      const conv = await openConversationWith(info.peerId);
      if (conv?._id) {
        await logCall(conv._id, {
          callType: info.callType,
          status: info.status,
          duration: info.duration,
        });
      }
    } catch {
      // Call logging error is non-critical
    }
  };

  const webrtc = useWebRTC(socket, userId || '', handleCallEnded);

  // Manage ringing audio effects
  useEffect(() => {
    if (webrtc.callState === 'incoming') {
      ringtone.startRingtone('incoming');
    } else if (webrtc.callState === 'calling') {
      ringtone.startRingtone('outgoing');
    } else {
      ringtone.stop();
    }
    return () => ringtone.stop();
  }, [webrtc.callState]);

  const callRemoteName = webrtc.incomingCall?.callerName || 'Caller';
  const callRemoteAvatar = webrtc.incomingCall?.callerAvatar || '';

  const isCallActive =
    webrtc.callState === 'calling' ||
    webrtc.callState === 'incoming' ||
    webrtc.callState === 'connected' ||
    webrtc.callState === 'reconnecting' ||
    webrtc.callState === 'failed';

  return (
    <CallContext.Provider value={webrtc}>
      {children}
      {isCallActive && (
        <CallOverlay
          callState={webrtc.callState}
          callType={webrtc.callType}
          remoteName={callRemoteName}
          remoteAvatar={callRemoteAvatar}
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          isMuted={webrtc.isMuted}
          isCamOff={webrtc.isCamOff}
          callDuration={webrtc.callDuration}
          error={webrtc.error}
          canSwitchCamera={webrtc.canSwitchCamera}
          onAnswer={webrtc.answerCall}
          onReject={webrtc.rejectCall}
          onEnd={webrtc.endCall}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onSwitchCamera={webrtc.switchCamera}
          onDismissError={webrtc.dismissError}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return ctx;
}
