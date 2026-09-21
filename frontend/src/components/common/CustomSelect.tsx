import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface CustomSelectProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  options: (SelectOption | string)[];
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  name,
  label,
  required = false,
  value,
  placeholder = 'Select an option',
  options,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  error,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Group filtered options if any option has a group
  const groupedOptions = useMemo(() => {
    const hasGroups = filteredOptions.some((opt) => !!opt.group);
    if (!hasGroups) return null;

    const groups: Record<string, SelectOption[]> = {};
    const ungrouped: SelectOption[] = [];

    filteredOptions.forEach((opt) => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { groups, ungrouped };
  }, [filteredOptions]);

  const handleToggle = () => {
    if (disabled) return;
    const willOpen = !open;
    setOpen(willOpen);
    setSearchQuery('');
    if (willOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !open) {
      handleToggle();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Button trigger */}
      <button
        type="button"
        id={id}
        name={name}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-gray-800 border text-left text-sm rounded-xl transition-all duration-200 outline-none ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-950/40'
            : open
            ? 'border-primary ring-2 ring-primary/20 shadow-sm'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
      >
        <span
          className={`truncate block ${
            selectedOption ? 'text-gray-800 dark:text-gray-100 font-normal' : 'text-gray-400'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search box inside popover */}
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/40">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto py-1 text-sm focus:outline-none scrollbar-thin"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-xs text-gray-400 text-center">
                No matching options found
              </li>
            ) : groupedOptions ? (
              <>
                {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="py-1">
                    <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50/60 dark:bg-gray-900/30">
                      {groupName}
                    </div>
                    {groupOpts.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <li
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(opt.value)}
                          className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-50 text-primary font-medium dark:bg-orange-950/30'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-orange-50/60 hover:text-primary dark:hover:bg-gray-700/60'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check size={15} className="text-primary shrink-0 ml-2" />}
                        </li>
                      );
                    })}
                  </div>
                ))}
                {groupedOptions.ungrouped.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700/60 pt-1">
                    {groupedOptions.ungrouped.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <li
                          key={opt.value}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(opt.value)}
                          className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-orange-50 text-primary font-medium dark:bg-orange-950/30'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-orange-50/60 hover:text-primary dark:hover:bg-gray-700/60'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check size={15} className="text-primary shrink-0 ml-2" />}
                        </li>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3.5 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50 text-primary font-medium dark:bg-orange-950/30'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-orange-50/60 hover:text-primary dark:hover:bg-gray-700/60'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={15} className="text-primary shrink-0 ml-2" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Inline error */}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};
