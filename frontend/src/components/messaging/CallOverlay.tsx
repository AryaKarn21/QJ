import React, { useEffect, useRef } from 'react';
import {
  PhoneOff, Video, VideoOff, Mic, MicOff, PhoneIncoming, AlertCircle,
} from 'lucide-react';

interface CallOverlayProps {
  callState: 'calling' | 'incoming' | 'connected' | 'failed';
  callType: 'audio' | 'video';
  remoteName: string;
  remoteAvatar?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCamOff: boolean;
  callDuration: number;
  error?: string | null;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onDismissError?: () => void;
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
        alt=""
        className="rounded-full object-cover ring-4 ring-white/20"
        style={{ width: px, height: px, maxWidth: '30vw', maxHeight: '30vw' }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center text-white font-bold ring-4 ring-white/20"
      style={{ width: px, height: px, maxWidth: '30vw', maxHeight: '30vw', fontSize: px * 0.36 }}
      aria-hidden="true"
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
  error,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onDismissError,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (callType === 'video' && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (callType === 'audio' && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callType]);

  const statusText =
    callState === 'failed' ? (error || 'Call ended')
    : callState === 'calling' ? 'Calling…'
    : callState === 'incoming' ? 'Incoming call'
    : formatDuration(callDuration);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={callType === 'video' ? 'Video call' : 'Voice call'}
    >
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

          {/* Local video — picture-in-picture. Anchored above the controls
              row (not a fixed px offset) so it never overlaps the buttons
              on short/landscape viewports, and sized as a fraction of the
              viewport (clamped) so it stays sensible from 320px up. */}
          <div
            className="absolute rounded-xl overflow-hidden border-2 border-white/30 shadow-lg"
            style={{
              width: 'clamp(72px, 26vw, 128px)',
              height: 'clamp(96px, 20vh, 168px)',
              top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
              right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
            }}
          >
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
                <VideoOff size={16} className="text-gray-400" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Name + duration */}
          <div
            className="absolute left-0 right-0 flex flex-col items-center px-4"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
          >
            <p className="text-white font-semibold text-base sm:text-lg drop-shadow truncate max-w-full">{remoteName}</p>
            <p className="text-white/70 text-xs sm:text-sm">{statusText}</p>
          </div>

          {/* Controls */}
          <div
            className="absolute left-0 right-0 flex justify-center gap-4 sm:gap-5 px-4"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
          >
            <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} onClick={onToggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} ariaLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'} />
            <CtrlBtn icon={isCamOff ? <VideoOff size={20} /> : <Video size={20} />} onClick={onToggleCamera} active={isCamOff} label={isCamOff ? 'Cam on' : 'Cam off'} ariaLabel={isCamOff ? 'Turn camera on' : 'Turn camera off'} />
            <CtrlBtn icon={<PhoneOff size={22} />} onClick={onEnd} red label="End" ariaLabel="End call" />
          </div>
        </div>

      ) : (
        /* ── Audio Call / Calling / Incoming / Failed Layout ── */
        <div
          className="relative z-10 flex flex-col items-center gap-4 sm:gap-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl w-[calc(100%-2rem)] max-w-sm px-6 py-8 sm:px-10 sm:py-10"
          style={{
            marginTop: 'env(safe-area-inset-top, 0px)',
            marginBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Hidden audio element for audio calls */}
          <audio ref={remoteAudioRef} autoPlay />

          {callState === 'failed' ? (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-500/20 text-red-300">
              <AlertCircle size={32} aria-hidden="true" />
            </div>
          ) : (
            <Avatar name={remoteName} src={remoteAvatar} size={20} />
          )}

          <div className="text-center min-w-0 w-full">
            {callState !== 'failed' && (
              <p className="text-white font-bold text-lg sm:text-xl truncate">{remoteName}</p>
            )}
            <p className="text-white/70 text-sm mt-1 break-words">
              {callState === 'failed'
                ? statusText
                : `${callType === 'video' ? '📹 Video call' : '🎙 Voice call'} · ${statusText}`}
            </p>
          </div>

          {/* Incoming call buttons */}
          {callState === 'incoming' && (
            <div className="flex gap-6 sm:gap-8 mt-2">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onReject}
                  aria-label="Decline call"
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-white/70 text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onAnswer}
                  aria-label="Answer call"
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
                <CtrlBtn icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />} onClick={onToggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} ariaLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'} />
              )}
              <CtrlBtn icon={<PhoneOff size={22} />} onClick={onEnd} red label="End" ariaLabel="End call" />
            </div>
          )}

          {/* Failed — dismissible, also auto-returns to idle on its own */}
          {callState === 'failed' && onDismissError && (
            <button
              onClick={onDismissError}
              className="mt-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-5 py-2.5 transition-all active:scale-95"
            >
              OK
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Small control button — sized for comfortable touch (≥44px hit target)
const CtrlBtn: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  red?: boolean;
  label?: string;
  ariaLabel: string;
}> = ({ icon, onClick, active, red, label, ariaLabel }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      aria-label={ariaLabel}
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
