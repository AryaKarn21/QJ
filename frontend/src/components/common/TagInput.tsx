import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  /** Comma-separated string — same shape the rest of the form (and the
   *  backend's array fields, via toArray/toCsv) already use, so this can
   *  drop straight into an existing `formData.<field>` without changing
   *  how it's submitted or pre-filled on edit. */
  value: string;
  onChange: (csv: string) => void;
  placeholder?: string;
  className?: string;
}

const parse = (csv: string) => csv.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * A Word-list-style input: type an item, press Enter or "," (or just
 * type a comma — same instinct as the plain comma-separated field it
 * replaces) and it turns into its own removable pill, the way a document
 * editor turns "item," into a new bullet. Committed value is still a
 * plain comma-separated string, so every call site keeps working as-is.
 */
export const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder, className = '' }) => {
  const tags = parse(value);
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...tags, next].join(', '));
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(tags.filter((_, i) => i !== index).join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeAt(tags.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Typing a comma directly (fastest path, matches the old field's
    // muscle memory) commits immediately instead of waiting for Enter.
    if (raw.includes(',')) {
      const [item, ...rest] = raw.split(',');
      commit(item);
      setDraft(rest.join(','));
      return;
    }
    setDraft(raw);
  };

  return (
    <div
      className={`w-full min-h-[42px] px-2 py-1.5 border border-gray-300 rounded-md flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary ${className}`}
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={`Remove ${tag}`}
            className="rounded-full p-0.5 text-primary/70 hover:bg-primary/20 hover:text-primary"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[120px] flex-1 border-none px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
      />
    </div>
  );
};

export default TagInput;
