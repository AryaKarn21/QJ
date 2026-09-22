import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { CVValidationResult } from '../config/countryCVConfigs/fieldValidation';

interface CvCompletionBarProps {
  validation: CVValidationResult;
  className?: string;
}

export const CvCompletionBar: React.FC<CvCompletionBarProps> = ({ validation, className = '' }) => {
  const [showMissing, setShowMissing] = useState(false);
  const { percentage, completedCount, totalRequiredCount, missingFields, isValid } = validation;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isValid
          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
          : 'border-orange-200 bg-orange-50/40 text-slate-800'
      } p-3.5 shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-orange-500 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight">
                {isValid ? '✓ CV information complete' : 'CV Completion Progress'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {percentage}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {completedCount} / {totalRequiredCount} required fields completed (Driving License is optional)
            </p>
          </div>
        </div>

        {!isValid && missingFields.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMissing((prev) => !prev)}
            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-50 transition shadow-2xs"
          >
            <span>{missingFields.length} missing</span>
            {showMissing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Progress Bar Track */}
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full transition-all duration-300 ${
            isValid ? 'bg-emerald-500' : 'bg-orange-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      {/* Missing Fields List Drawer */}
      {showMissing && !isValid && (
        <div className="mt-3 rounded-lg border border-orange-100 bg-white p-3 text-xs space-y-1.5 animate-in fade-in duration-150">
          <p className="font-semibold text-slate-700">Please complete the following required fields:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {missingFields.map((field) => (
              <div key={field} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>{field}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
