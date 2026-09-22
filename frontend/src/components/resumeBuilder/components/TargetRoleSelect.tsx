import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Edit3 } from 'lucide-react';

interface TargetRoleSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export const TARGET_ROLE_OPTIONS = [
  'Data Entry Operator',
  'Dairy Production Worker',
  'Factory / Production Worker',
  'Warehouse Worker / Handler',
  'General Construction Worker',
  'Driver / Heavy Equipment Operator',
  'Electrician',
  'Plumber / Pipefitter',
  'Welder / Fabricator',
  'Frontend Engineer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
  'Mobile App Developer',
  'DevOps Engineer',
  'Chef / Cook / Kitchen Helper',
  'Waiter / Hospitality Staff',
  'Housekeeping / Cleaner',
  'Security Guard',
  'Customer Support Representative',
  'Sales Executive / Retail Assistant',
  'Accountant / Cashier',
  'Administrative Assistant / Clerk',
  'HR Assistant / Officer',
  'Nurse / Caregiver',
];

export const TargetRoleSelect: React.FC<TargetRoleSelectProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'e.g. Data Entry Operator, Frontend Engineer',
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (role: string) => {
    if (role === 'Other') {
      onChange('');
      setIsOpen(false);
    } else {
      onChange(role);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white transition"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          title="Choose from list of roles"
          tabIndex={-1}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Suggested Target Roles
          </div>
          {TARGET_ROLE_OPTIONS.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-orange-50 hover:text-orange-700 transition ${
                value === role ? 'bg-orange-50/70 font-semibold text-orange-600' : 'text-slate-700'
              }`}
            >
              <span>{role}</span>
              {value === role && <Check size={13} className="text-orange-500 shrink-0 ml-1.5" />}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={() => handleSelect('Other')}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-slate-500 hover:bg-slate-50 hover:text-slate-800 italic"
            >
              <Edit3 size={12} />
              <span>Other (Type custom role in box above)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
