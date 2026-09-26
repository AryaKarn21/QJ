import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface LanguageSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  required?: boolean;
  className?: string;
  placeholder?: string;
}

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Combine unique options with the current value if value isn't in options
  const allOptions = React.useMemo(() => {
    if (value && !options.some((o) => o.toLowerCase() === value.toLowerCase())) {
      return [value, ...options];
    }
    return options;
  }, [value, options]);

  const filtered = allOptions.filter((opt) => {
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
    <div className={`relative ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[36px] flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs text-left transition shadow-2xs ${
          isOpen
            ? 'border-orange-500 ring-1 ring-orange-200 bg-white'
            : value
            ? 'border-slate-200 text-slate-800 bg-white hover:border-slate-300'
            : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
      >
        <span className="truncate font-medium">{value || placeholder}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 ml-1.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/90 flex items-center gap-1.5">
            <Search size={13} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
              placeholder="Search or enter language…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length > 0) {
                    handleSelect(filtered[0]);
                  } else if (query.trim()) {
                    handleSelect(query.trim());
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X size={12} />
              </button>
            )}
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
              <>
                {query.trim() && !allOptions.some((o) => o.toLowerCase() === query.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => handleSelect(query.trim())}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left text-orange-600 bg-orange-50/60 hover:bg-orange-100 font-semibold transition mb-1"
                  >
                    <span>Use custom: "{query.trim()}"</span>
                    <Check size={13} className="text-orange-600 shrink-0" />
                  </button>
                )}
                {filtered.map((opt) => {
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
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelect;
