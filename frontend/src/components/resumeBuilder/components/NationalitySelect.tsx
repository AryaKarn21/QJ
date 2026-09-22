import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { NATIONALITIES } from '../config/countryCVConfigs/nationalities';

interface NationalitySelectProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export const NationalitySelect: React.FC<NationalitySelectProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'Select Nationality…',
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

  const filtered = NATIONALITIES.filter((n) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return n.demonym.toLowerCase().includes(q) || n.country.toLowerCase().includes(q);
  });

  const handleSelect = (demonym: string) => {
    onChange(demonym);
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
              placeholder="Search nationality or country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching nationality found.
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
                const isSelected = value.toLowerCase() === opt.demonym.toLowerCase();
                return (
                  <button
                    key={opt.demonym}
                    type="button"
                    onClick={() => handleSelect(opt.demonym)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left transition ${
                      isSelected
                        ? 'bg-orange-50 font-semibold text-orange-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>
                      {opt.demonym}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({opt.country})
                      </span>
                    </span>
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
