import React, { useEffect, useRef, useState } from 'react';
import { Smile, ThumbsUp, Briefcase, Sparkles, Search, X } from 'lucide-react';

interface EmojiItem {
  emoji: string;
  name: string;
  category: 'smileys' | 'gestures' | 'career' | 'celebration';
}

const EMOJI_DATABASE: EmojiItem[] = [
  // Smileys & Reactions
  { emoji: '😀', name: 'grinning face', category: 'smileys' },
  { emoji: '😃', name: 'smiling face with big eyes', category: 'smileys' },
  { emoji: '😄', name: 'smiling face with smiling eyes', category: 'smileys' },
  { emoji: '😁', name: 'beaming face', category: 'smileys' },
  { emoji: '😆', name: 'grinning squinting face', category: 'smileys' },
  { emoji: '😅', name: 'sweat smile', category: 'smileys' },
  { emoji: '🤣', name: 'rofl rolling on the floor laughing', category: 'smileys' },
  { emoji: '😂', name: 'face with tears of joy joy laugh', category: 'smileys' },
  { emoji: '🙂', name: 'slightly smiling face', category: 'smileys' },
  { emoji: '🙃', name: 'upside down face', category: 'smileys' },
  { emoji: '😉', name: 'winking face wink', category: 'smileys' },
  { emoji: '😊', name: 'smiling face with smiling eyes blush', category: 'smileys' },
  { emoji: '😇', name: 'smiling face with halo angel', category: 'smileys' },
  { emoji: '🥰', name: 'smiling face with hearts in love', category: 'smileys' },
  { emoji: '😍', name: 'heart eyes love', category: 'smileys' },
  { emoji: '🤩', name: 'star struck excited', category: 'smileys' },
  { emoji: '😘', name: 'face blowing a kiss', category: 'smileys' },
  { emoji: '😋', name: 'face savoring food delicious yum', category: 'smileys' },
  { emoji: '😛', name: 'face with tongue', category: 'smileys' },
  { emoji: '😜', name: 'winking face with tongue playful', category: 'smileys' },
  { emoji: '🤪', name: 'zany face goofy crazy', category: 'smileys' },
  { emoji: '😎', name: 'smiling face with sunglasses cool confident', category: 'smileys' },
  { emoji: '🤓', name: 'nerd face geek smart', category: 'smileys' },
  { emoji: '🧐', name: 'face with monocle inspecting curious', category: 'smileys' },
  { emoji: '🥳', name: 'partying face celebrate', category: 'smileys' },
  { emoji: '😏', name: 'smirking face sly', category: 'smileys' },
  { emoji: '🤔', name: 'thinking face hmm wonder', category: 'smileys' },
  { emoji: '🤫', name: 'shushing face quiet secret', category: 'smileys' },
  { emoji: '🤭', name: 'face with hand over mouth oops', category: 'smileys' },
  { emoji: '🤗', name: 'hugging face hug warmth', category: 'smileys' },
  { emoji: '🤐', name: 'zipper mouth face silent', category: 'smileys' },
  { emoji: '😐', name: 'neutral face straight', category: 'smileys' },
  { emoji: '😴', name: 'sleeping face zzz tired', category: 'smileys' },
  { emoji: '😷', name: 'face with medical mask', category: 'smileys' },
  { emoji: '🥺', name: 'pleading face please puppy eyes', category: 'smileys' },
  { emoji: '😢', name: 'crying face sad tear', category: 'smileys' },
  { emoji: '😭', name: 'loudly crying face sob', category: 'smileys' },
  { emoji: '😱', name: 'face screaming in fear shocked wow', category: 'smileys' },
  { emoji: '😤', name: 'face with steam from nose proud triumph', category: 'smileys' },
  { emoji: '😡', name: 'pouting face mad red angry', category: 'smileys' },

  // Gestures & People
  { emoji: '👋', name: 'waving hand hello bye', category: 'gestures' },
  { emoji: '🤚', name: 'raised back of hand', category: 'gestures' },
  { emoji: '🖐️', name: 'hand with fingers splayed five', category: 'gestures' },
  { emoji: '✋', name: 'raised hand high five stop', category: 'gestures' },
  { emoji: '👌', name: 'ok hand perfect fine', category: 'gestures' },
  { emoji: '🤌', name: 'pinched fingers italian', category: 'gestures' },
  { emoji: '🤏', name: 'pinching hand small little bit', category: 'gestures' },
  { emoji: '✌️', name: 'victory hand peace two', category: 'gestures' },
  { emoji: '🤞', name: 'crossed fingers good luck hope', category: 'gestures' },
  { emoji: '🤟', name: 'love you gesture', category: 'gestures' },
  { emoji: '🤘', name: 'sign of the horns rock on', category: 'gestures' },
  { emoji: '🤙', name: 'call me hand shaka', category: 'gestures' },
  { emoji: '👈', name: 'backhand index pointing left', category: 'gestures' },
  { emoji: '👉', name: 'backhand index pointing right', category: 'gestures' },
  { emoji: '👆', name: 'backhand index pointing up', category: 'gestures' },
  { emoji: '👇', name: 'backhand index pointing down', category: 'gestures' },
  { emoji: '👍', name: 'thumbs up like agree approve good yes', category: 'gestures' },
  { emoji: '👎', name: 'thumbs down dislike no', category: 'gestures' },
  { emoji: '✊', name: 'raised fist power strength', category: 'gestures' },
  { emoji: '👊', name: 'oncoming fist punch brofist bump', category: 'gestures' },
  { emoji: '👏', name: 'clapping hands applause kudos congrats', category: 'gestures' },
  { emoji: '🙌', name: 'raising hands celebration praise hooray', category: 'gestures' },
  { emoji: '👐', name: 'open hands embrace', category: 'gestures' },
  { emoji: '🤲', name: 'palms up together', category: 'gestures' },
  { emoji: '🤝', name: 'handshake deal agreement partnership partner meet', category: 'gestures' },
  { emoji: '🙏', name: 'folded hands pray please thank you namaste', category: 'gestures' },
  { emoji: '✍️', name: 'writing hand note apply sign', category: 'gestures' },
  { emoji: '💪', name: 'flexed biceps muscle strong effort power', category: 'gestures' },
  { emoji: '👀', name: 'eyes look see viewing watch', category: 'gestures' },
  { emoji: '🧠', name: 'brain smart intelligent mind thinking', category: 'gestures' },
  { emoji: '❤️', name: 'red heart love passion like', category: 'gestures' },
  { emoji: '💙', name: 'blue heart trust peace', category: 'gestures' },
  { emoji: '💚', name: 'green heart growth health', category: 'gestures' },
  { emoji: '🧡', name: 'orange heart warmth friendship', category: 'gestures' },
  { emoji: '💜', name: 'purple heart luxury', category: 'gestures' },
  { emoji: '🤍', name: 'white heart pure', category: 'gestures' },
  { emoji: '💯', name: 'hundred points perfect 100 score', category: 'gestures' },
  { emoji: '🔥', name: 'fire lit hot trending exciting impressive', category: 'gestures' },

  // Career & Professional
  { emoji: '💼', name: 'briefcase work job career business portfolio', category: 'career' },
  { emoji: '📁', name: 'file folder document resume cv', category: 'career' },
  { emoji: '📂', name: 'open file folder files archive', category: 'career' },
  { emoji: '📄', name: 'page facing up resume document report', category: 'career' },
  { emoji: '📊', name: 'bar chart analytics stats growth data report', category: 'career' },
  { emoji: '📈', name: 'chart increasing upward trend profit success', category: 'career' },
  { emoji: '📉', name: 'chart decreasing trend down', category: 'career' },
  { emoji: '📋', name: 'clipboard checklist tasks requirements audit', category: 'career' },
  { emoji: '📌', name: 'pushpin notice pinned highlight', category: 'career' },
  { emoji: '📍', name: 'round pushpin location address on-site office', category: 'career' },
  { emoji: '📎', name: 'paperclip attachment file resume', category: 'career' },
  { emoji: '💻', name: 'laptop computer tech coding remote developer software', category: 'career' },
  { emoji: '🖥️', name: 'desktop computer pc workstation', category: 'career' },
  { emoji: '📱', name: 'mobile phone cell call app smartphone', category: 'career' },
  { emoji: '📞', name: 'telephone receiver call phone contact interview', category: 'career' },
  { emoji: '📧', name: 'e-mail mail message letter inbox', category: 'career' },
  { emoji: '✉️', name: 'envelope message email letter offer', category: 'career' },
  { emoji: '💡', name: 'light bulb idea inspiration creative insight', category: 'career' },
  { emoji: '🚀', name: 'rocket launch startup growth career speed boost promotion', category: 'career' },
  { emoji: '🎯', name: 'bullseye target goal objective focus aim hire', category: 'career' },
  { emoji: '🏆', name: 'trophy champion win achievement winner prize accepted', category: 'career' },
  { emoji: '🥇', name: '1st place medal gold winner first', category: 'career' },
  { emoji: '🥈', name: '2nd place medal silver second', category: 'career' },
  { emoji: '🥉', name: '3rd place medal bronze third', category: 'career' },
  { emoji: '🏢', name: 'office building company employer corporate headquarters', category: 'career' },
  { emoji: '🏗️', name: 'building construction site project architect engineering', category: 'career' },
  { emoji: '🛠️', name: 'hammer and wrench tools skilled worker maintenance', category: 'career' },
  { emoji: '🔧', name: 'wrench mechanic tool technician', category: 'career' },
  { emoji: '⚙️', name: 'gear settings operations engineering process system', category: 'career' },
  { emoji: '🔬', name: 'microscope science research lab analyst', category: 'career' },
  { emoji: '🎓', name: 'graduation cap degree university education alumni student', category: 'career' },
  { emoji: '📜', name: 'scroll diploma certificate license credential legal', category: 'career' },
  { emoji: '💰', name: 'money bag salary earnings compensation pay bonus', category: 'career' },
  { emoji: '💵', name: 'dollar banknote cash currency pay salary', category: 'career' },
  { emoji: '⚖️', name: 'balance scale legal law justice fairness equality', category: 'career' },

  // Celebration, Milestones & Fun
  { emoji: '🎉', name: 'party popper celebrate congratulations congrats celebration hired accepted', category: 'celebration' },
  { emoji: '🎊', name: 'confetti ball celebration festivity event', category: 'celebration' },
  { emoji: '🥳', name: 'partying face celebrate happy party joyous', category: 'celebration' },
  { emoji: '🎈', name: 'balloon party birthday celebration welcome', category: 'celebration' },
  { emoji: '🎁', name: 'wrapped gift present offer reward perk bonus', category: 'celebration' },
  { emoji: '🎀', name: 'ribbon decoration prize celebration', category: 'celebration' },
  { emoji: '✨', name: 'sparkles shiny new special clean magic ai', category: 'celebration' },
  { emoji: '⭐', name: 'star rating favorite top highlight quality review', category: 'celebration' },
  { emoji: '🌟', name: 'glowing star exceptional outstanding top performer', category: 'celebration' },
  { emoji: '💫', name: 'dizzy star magic energy sparkle', category: 'celebration' },
  { emoji: '💥', name: 'collision boom impact wow breakthrough', category: 'celebration' },
  { emoji: '🥂', name: 'clinking glasses cheers toast celebrate partnership', category: 'celebration' },
  { emoji: '🍻', name: 'clinking beer mugs celebration team outing cheers', category: 'celebration' },
  { emoji: '🍰', name: 'shortcake celebration cake milestone sweet', category: 'celebration' },
  { emoji: '🎂', name: 'birthday cake celebration anniversary milestone', category: 'celebration' },
  { emoji: '☕', name: 'hot beverage coffee tea morning break chat meet', category: 'celebration' },
  { emoji: '🍕', name: 'pizza team lunch food treat', category: 'celebration' },
  { emoji: '☀️', name: 'sun sunny bright morning positive energy day', category: 'celebration' },
  { emoji: '🌈', name: 'rainbow diversity hope future colorful positive', category: 'celebration' },
  { emoji: '⚡', name: 'high voltage quick fast speed active lightning energy', category: 'celebration' },
  { emoji: '🔔', name: 'bell notification alert reminder update news ringing', category: 'celebration' },
  { emoji: '📢', name: 'loudspeaker announcement hiring notice news broadcast', category: 'celebration' },
  { emoji: '📣', name: 'megaphone cheer announcement shoutout', category: 'celebration' },
  { emoji: '💬', name: 'speech balloon comment message chat talk feedback', category: 'celebration' },
  { emoji: '💭', name: 'thought balloon think reflect idea dream', category: 'celebration' },
  { emoji: '✅', name: 'check mark button verified approved accepted pass done yes', category: 'celebration' },
  { emoji: '❌', name: 'cross mark no cancel rejected false error', category: 'celebration' },
  { emoji: '⚠️', name: 'warning notice important caution alert heads up', category: 'celebration' },
];

export interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  position = 'top',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'smileys' | 'gestures' | 'career' | 'celebration'>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus search input when opened
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEmojis = searchQuery.trim()
    ? EMOJI_DATABASE.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.emoji.includes(searchQuery)
      )
    : EMOJI_DATABASE.filter((item) => item.category === activeTab);

  const positionClasses = {
    top: 'bottom-full mb-2 left-0',
    'top-right': 'bottom-full mb-2 right-0',
    bottom: 'top-full mt-2 left-0',
    'bottom-right': 'top-full mt-2 right-0',
  }[position];

  return (
    <div
      ref={containerRef}
      className={`absolute z-[80] w-72 sm:w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900 ${positionClasses} ${className}`}
      role="dialog"
      aria-label="Emoji picker"
    >
      {/* Search Header */}
      <div className="relative mb-2 flex items-center">
        <Search size={14} className="pointer-events-none absolute left-3 text-gray-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search emoji (e.g. smile, job, fire)…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 py-1.5 pl-8 pr-7 text-xs text-gray-800 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-primary"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 rounded-full p-0.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!searchQuery && (
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2 text-xs dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('smileys')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors ${
              activeTab === 'smileys'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Smileys & Reactions"
          >
            <Smile size={13} />
            <span className="text-[11px]">Smileys</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gestures')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors ${
              activeTab === 'gestures'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Gestures & People"
          >
            <ThumbsUp size={13} />
            <span className="text-[11px]">Hands</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('career')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors ${
              activeTab === 'career'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Career & Work"
          >
            <Briefcase size={13} />
            <span className="text-[11px]">Work</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('celebration')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors ${
              activeTab === 'celebration'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Celebration & Fun"
          >
            <Sparkles size={13} />
            <span className="text-[11px]">Celebrate</span>
          </button>
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto pr-1 sm:max-h-56">
        {filteredEmojis.map((item) => (
          <button
            key={item.emoji + item.name}
            type="button"
            onClick={() => {
              onSelect(item.emoji);
            }}
            title={item.name}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-transform duration-100 hover:scale-125 hover:bg-gray-100 active:scale-95 dark:hover:bg-slate-800"
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {filteredEmojis.length === 0 && (
        <div className="py-6 text-center text-xs text-gray-400 dark:text-slate-500">
          No emoji found for "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
