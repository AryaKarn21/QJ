import React, { useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming,
} from 'lucide-react';

interface CallOverlayProps {
  callState: 'calling' | 'incoming' | 'connected';
  callType: 'audio' | 'video';
  remoteName: string;
  remoteAvatar?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCamOff: boolean;
  callDuration: number;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const Avatar: React.FC<{ name: string; src?: string; size?: number }> = ({ name, src, size = 20 }) => {
  const px = size * 4;
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover ring-4 ring-white/20"
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-white font-bold ring-4 ring-white/20"
      style={{ width: px, height: px, fontSize: px * 0.36 }}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  callType,
  remoteName,
  remoteAvatar,
  localStream,
  remoteStream,
  isMuted,
  isCamOff,
  callDuration,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (callType === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callType]);

  const statusText =
    callState === 'calling' ? 'Calling…'
    : callState === 'incoming' ? 'Incoming call'
    : formatDuration(callDuration);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* ── Video Call Layout ── */}
      {callType === 'video' && callState === 'connected' ? (
        <div className="relative w-full h-full">
          {/* Remote video — full screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Local video — picture-in-picture */}
          <div className="absolute bottom-24 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {isCamOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff size={16} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* Name + duration */}
          <div className="absolute top-6 left-0 right-0 flex flex-col items-center">
            <p className="text-white font-semibold text-lg drop-shadow">{remoteName}</p>
            <p className="text-white/70 text-sm">{statusText}</p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-5">
            <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} onClick={onToggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} />
            <CtrlBtn icon={isCamOff ? <VideoOff size={20} /> : <Video size={20} />} onClick={onToggleCamera} active={isCamOff} label={isCamOff ? 'Cam on' : 'Cam off'} />
            <CtrlBtn icon={<PhoneOff size={22} />} onClick={onEnd} red label="End" />
          </div>
        </div>

      ) : (
        /* ── Audio Call / Calling / Incoming Layout ── */
        <div className="relative z-10 flex flex-col items-center gap-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 px-10 py-10 shadow-2xl min-w-[320px]">
          {/* Hidden audio element for audio calls */}
          <audio ref={remoteAudioRef} autoPlay />

          <Avatar name={remoteName} src={remoteAvatar} size={20} />
          <div className="text-center">
            <p className="text-white font-bold text-xl">{remoteName}</p>
            <p className="text-white/60 text-sm mt-1">
              {callType === 'video' ? '📹 Video call' : '🎙 Voice call'} · {statusText}
            </p>
          </div>

          {/* Incoming call buttons */}
          {callState === 'incoming' && (
            <div className="flex gap-8 mt-2">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-white/70 text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onAnswer}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 animate-bounce"
                >
                  <PhoneIncoming size={26} />
                </button>
                <span className="text-white/70 text-xs">Answer</span>
              </div>
            </div>
          )}

          {/* Calling / connected buttons */}
          {(callState === 'calling' || callState === 'connected') && (
            <div className="flex gap-5 mt-2">
              {callState === 'connected' && (
                <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} onClick={onToggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} />
              )}
              <CtrlBtn icon={<PhoneOff size={22} />} onClick={onEnd} red label="End" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Small control button
const CtrlBtn: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  red?: boolean;
  label?: string;
}> = ({ icon, onClick, active, red, label }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 ${
        red ? 'bg-red-500 hover:bg-red-600' : active ? 'bg-white/30 hover:bg-white/40' : 'bg-white/15 hover:bg-white/25'
      }`}
    >
      {icon}
    </button>
    {label && <span className="text-white/70 text-xs">{label}</span>}
  </div>
);

export default CallOverlay;