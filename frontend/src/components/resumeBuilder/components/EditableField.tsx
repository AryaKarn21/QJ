/**
 * EditableField.tsx — REPLACES existing
 * Path: frontend/src/components/resumeBuilder/components/EditableField.tsx
 *
 * Fixes vs original:
 * - Inputs no longer overflow resume card on mobile (w-full + box-sizing)
 * - Subtle edit indicator instead of heavy dashed blue border
 * - Textarea auto-grows instead of fixed 3 rows
 * - Cleaner focus ring that matches resume aesthetics
 */

import React, { useRef, useEffect } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  isPreviewMode: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  className = '',
  multiline = false,
  placeholder = 'Click to edit…',
  isPreviewMode,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  // Preview mode — pure display, no inputs at all
  if (isPreviewMode) {
    return multiline ? (
      <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    ) : (
      <span className={className}>{value}</span>
    );
  }

  // Shared edit-mode styles — subtle ring on focus only, no always-visible border
  const editBase =
    'bg-transparent outline-none ring-0 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ' +
    'rounded transition-all duration-150 w-full min-w-0 ' +
    'hover:bg-blue-50/40';

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={`${className} ${editBase} resize-none overflow-hidden leading-relaxed px-1 py-0.5`}
        placeholder={placeholder}
        rows={1}
        style={{ boxSizing: 'border-box' }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} ${editBase} px-1 py-0.5`}
      placeholder={placeholder}
      style={{ boxSizing: 'border-box' }}
    />
  );
};

export default EditableField;