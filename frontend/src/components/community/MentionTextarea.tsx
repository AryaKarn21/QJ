import { useEffect, useRef, useState } from 'react';
import { searchMentionableUsers } from '../../api/followApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import type { AuthorSnapshot } from '../../types/community';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

// A plain <textarea> that watches for "@" and shows a name-search dropdown;
// picking someone inserts the @[Name](userId) token that the backend's
// utils/textParsing.js resolves into a real mention. Hashtags need no
// special input handling — the user just types #word and the backend
// extracts it from the raw text.
export function MentionTextarea({ value, onChange, placeholder, rows = 4, className = '', autoFocus }: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<AuthorSnapshot[]>([]);
  const [mentionQuery, setMentionQuery] = useState<{ start: number; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!mentionQuery || mentionQuery.text.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      searchMentionableUsers(mentionQuery.text).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart;
    const uptoCursor = newValue.slice(0, cursor);
    const match = uptoCursor.match(/@([a-zA-Z\s]{0,40})$/);
    if (match) {
      setMentionQuery({ start: cursor - match[1].length - 1, text: match[1].trim() });
    } else {
      setMentionQuery(null);
    }
  };

  const pickMention = (user: AuthorSnapshot) => {
    if (!mentionQuery || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const before = value.slice(0, mentionQuery.start);
    const after = value.slice(cursor);
    const token = `@[${user.name}](${user._id}) `;
    onChange(`${before}${token}${after}`);
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={`w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-dark placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-72 max-w-full rounded-lg border border-gray-200 bg-light shadow-card-hover">
          {suggestions.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => pickMention(user)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary"
            >
              {user.avatar ? (
                <img src={resolveMediaUrl(user.avatar)} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {user.name?.[0]?.toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-dark">{user.name}</span>
                <span className="block truncate text-xs text-gray-500">{user.headline || user.role}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
