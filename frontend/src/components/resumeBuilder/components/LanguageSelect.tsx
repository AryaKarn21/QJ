import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  required?: boolean;
  className?: string;
  placeholder?: string;
}

// Same searchable-listbox pattern as NationalitySelect.tsx (mirrored, not
// generalized into a shared component, since the two option shapes — plain
// strings here vs. {demonym, country} there — aren't worth an abstraction
// for two call sites). Replaces a plain native <select> over a 70+ item
// list: on mobile, opening a native <select> hands rendering entirely to
// the OS (that's the full-screen unstyled picker in the reported
// screenshot) with no search — this keeps the list inside the app's own
// styled, scrollable, filterable panel instead.
export const LanguageSelect: React.FC<LanguageSelectProps> = ({
  value,
  onChange,
  options,
  required = false,
  className = '',
  placeholder = 'Select Language…',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filtered = options.filter((opt) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return opt.toLowerCase().includes(q);
  });

  const handleSelect = (lang: string) => {
    onChange(lang);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-left transition ${
          isOpen
            ? 'border-orange-500 ring-1 ring-orange-200'
            : value
            ? 'border-slate-200 text-slate-800 bg-white'
            : 'border-slate-200 text-slate-400 bg-white'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1.5" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
            <Search size={13} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
              placeholder="Search language…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching language found.
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="block mt-1 w-full text-center text-orange-600 hover:underline font-semibold"
                  >
                    Use "{query.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = value.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left transition ${
                      isSelected
                        ? 'bg-orange-50 font-semibold text-orange-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={13} className="text-orange-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelect;
