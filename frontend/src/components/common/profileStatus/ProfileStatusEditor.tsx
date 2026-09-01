import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Drawer } from '../../ui/Drawer';
import {
  ProfileStatus,
  ProfileStatusType,
  ProfileStatusValue,
  ProfileVisibility,
  STATUS_EDITOR_CONFIG,
  VISIBILITY_OPTIONS,
} from '../../../types/profileStatus';

const MAX_CHIPS = 10;
const MAX_CHIP_LENGTH = 60;

interface ChipListInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

/**
 * `[ Frontend Developer × ]` style tag input — type + Enter/comma to add,
 * click × to remove. Self-contained here since it's only used by this
 * editor (target roles, locations, employment types), all with identical
 * behavior and the same client-side mirror of the backend's
 * sanitizeStringList caps (utils/profileStatus.js) so the count/length
 * limit is obvious before the request round-trips, not just enforced
 * silently server-side.
 */
const ChipListInput: React.FC<ChipListInputProps> = ({ label, values, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim().slice(0, MAX_CHIP_LENGTH);
    if (!trimmed) return;
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    if (values.length >= MAX_CHIPS) {
      toast.error(`You can add up to ${MAX_CHIPS} ${label.toLowerCase()}.`);
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="text-slate-400 hover:text-red-500"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-none bg-transparent p-1 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
      </div>
    </div>
  );
};

export interface ProfileStatusSavePayload {
  status: ProfileStatusValue;
  targetRoles: string[];
  preferredLocations: string[];
  employmentTypes: string[];
  visibility: ProfileVisibility;
}

interface ProfileStatusEditorProps {
  open: boolean;
  onClose: () => void;
  statusType: ProfileStatusType;
  currentStatus?: ProfileStatus | null;
  /**
   * Actual API call lives with the caller (jobseekerApi.ts /
   * employerApi.ts) — this component only knows how to collect the form
   * and hand it off, keeping the network/business logic out of the
   * component tree per the "future mobile app, same API" architecture
   * constraint this feature was built under.
   */
  onSave: (payload: ProfileStatusSavePayload) => Promise<ProfileStatus>;
  onSaved: (updated: ProfileStatus) => void;
}

/**
 * Shared status editor drawer for both roles (spec's
 * JobSeekerStatusForm/EmployerHiringStatusForm) — the two flows are
 * identical in shape (status choice + roles + locations + employment
 * types + visibility), differing only in copy and the status enum, both
 * of which come from STATUS_EDITOR_CONFIG. Keeping one implementation
 * driven by `statusType` avoids maintaining two near-duplicate forms.
 */
export const ProfileStatusEditor: React.FC<ProfileStatusEditorProps> = ({
  open,
  onClose,
  statusType,
  currentStatus,
  onSave,
  onSaved,
}) => {
  const config = STATUS_EDITOR_CONFIG[statusType];

  const [status, setStatus] = useState<ProfileStatusValue>(config.options[0].value);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ProfileVisibility>('public');
  const [saving, setSaving] = useState(false);

  // Re-seed the form from the current status every time the drawer opens
  // (not on every prop change) so an in-progress edit isn't clobbered by
  // an unrelated re-render of the parent profile page.
  useEffect(() => {
    if (!open) return;
    setStatus(currentStatus?.status ?? config.options[0].value);
    setTargetRoles(currentStatus?.targetRoles ?? []);
    setPreferredLocations(currentStatus?.preferredLocations ?? []);
    setEmploymentTypes(currentStatus?.employmentTypes ?? []);
    setVisibility(currentStatus?.visibility ?? 'public');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (saving) return; // guards against a double-click firing two requests
    setSaving(true);
    try {
      const updated = await onSave({ status, targetRoles, preferredLocations, employmentTypes, visibility });
      onSaved(updated);
      toast.success(config.successMessage);
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update your status. Please try again.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={config.title} widthClassName="max-w-lg">
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">{config.question}</p>
          <div className="space-y-2">
            {config.options.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  status === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="profile-status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                  <span className={`h-1.5 w-1.5 rounded-full ${option.dotClass}`} aria-hidden="true" />
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <ChipListInput
          label={config.targetRolesLabel}
          values={targetRoles}
          onChange={setTargetRoles}
          placeholder="Type a role and press Enter"
        />
        <ChipListInput
          label={statusType === 'JOB_SEEKER' ? 'Preferred Locations' : 'Work Locations'}
          values={preferredLocations}
          onChange={setPreferredLocations}
          placeholder="Type a location and press Enter"
        />
        <ChipListInput
          label={statusType === 'JOB_SEEKER' ? 'Employment Preferences' : 'Employment Types'}
          values={employmentTypes}
          onChange={setEmploymentTypes}
          placeholder="e.g. Full-time, Contract, Remote"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === 'network' ? config.networkVisibilityLabel : opt.label}
              </option>
            ))}
          </select>
          {visibility === 'private' && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Your status won't be shown on your public profile.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Drawer>
  );
};

export default ProfileStatusEditor;
