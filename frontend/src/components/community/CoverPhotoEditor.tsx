import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches backend/middleware/userUploadMiddleware.js's shared 2MB limit

interface CoverPhotoEditorProps {
  /** Root-relative stored path (e.g. "/uploads/cover_photos/xyz.jpg"), or null/undefined if none set. */
  coverPhoto?: string | null;
  /** Only the profile owner gets upload/remove controls — visitors just see the image. */
  editable: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

/**
 * Cover-photo banner shared by the Community Profile page for both
 * jobseeker and employer owners. Visitors (editable=false) render the
 * exact same banner with zero controls — there is no separate "public"
 * variant to keep in sync.
 *
 * Upload flow: pick file -> client-side validate -> preview (unsaved) ->
 * explicit Save or Cancel. Nothing is uploaded until Save is pressed, so
 * "Cancel upload" just discards the local preview with no network call.
 */
export function CoverPhotoEditor({ coverPhoto, editable, onUpload, onRemove }: CoverPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const resolvedCover = resolveMediaUrl(coverPhoto);
  const hasCover = Boolean(coverPhoto);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please choose a JPG, PNG, or WEBP image.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'Image must be 2MB or smaller.';
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleSave = async () => {
    if (!pendingFile) return;
    setSaving(true);
    try {
      await onUpload(pendingFile);
      toast.success('Cover photo updated.');
      cancelPreview();
    } catch {
      toast.error('Could not upload cover photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!hasCover || removing) return;
    if (!window.confirm('Remove your cover photo?')) return;
    setRemoving(true);
    try {
      await onRemove();
      toast.success('Cover photo removed.');
    } catch {
      toast.error('Could not remove cover photo. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  // Reviewing a pending selection before it's saved — shows the local
  // preview plus explicit Save/Cancel, never auto-uploads.
  if (pendingFile && previewUrl) {
    return (
      <div className="relative h-36 overflow-hidden bg-gray-900 sm:h-44">
        <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving…' : 'Save cover'}
          </button>
          <button
            onClick={cancelPreview}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-white disabled:opacity-60"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-36 overflow-hidden bg-gradient-to-br from-primary via-[#8B3F26] to-[#5C2416] sm:h-44"
    >
      {hasCover ? (
        <img src={resolvedCover} alt="Cover" className="h-full w-full object-cover" />
      ) : (
        // QuickJobs-branded fallback — the original decorative gradient pattern.
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />
      )}

      {editable && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          {hasCover && (
            <button
              onClick={handleRemove}
              disabled={removing}
              title="Remove cover photo"
              className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/45 disabled:opacity-60"
            >
              {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/45"
          >
            <Camera size={12} />
            {hasCover ? 'Change cover' : 'Add cover photo'}
          </button>
        </div>
      )}
    </div>
  );
}
