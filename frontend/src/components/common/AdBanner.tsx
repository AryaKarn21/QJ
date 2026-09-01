import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  getActiveAdvertisements,
  recordAdImpression,
  recordAdClick,
  type AdPlacement,
  type PublicAd,
} from '../../api/advertisementApi';

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';
const resolveImage = (url: string) => `${MEDIA_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

/**
 * Real advertisement banner — fetches whatever is actually active for the
 * given placement (backend/controllers/advertisementController.js), and
 * only renders if the admin has published at least one. No placeholder,
 * no fallback creative: an empty result means this renders nothing at
 * all, exactly like every other "no data yet" section in this app.
 *
 * Impressions/clicks are real, fired once per render/click — not
 * estimated or seeded.
 */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<PublicAd | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const trackedImpression = useRef<string | null>(null);

  useEffect(() => {
    getActiveAdvertisements(placement)
      .then((ads) => setAd(ads[0] || null))
      .catch(() => setAd(null));
  }, [placement]);

  useEffect(() => {
    if (ad && trackedImpression.current !== ad._id) {
      trackedImpression.current = ad._id;
      recordAdImpression(ad._id);
    }
  }, [ad]);

  if (!ad || dismissed) return null;

  const isExternal = /^https?:\/\//i.test(ad.linkUrl);

  const handleClick = () => {
    recordAdClick(ad._id);
  };

  return (
    <div className="relative mx-auto my-6 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        <a
          href={ad.linkUrl}
          onClick={handleClick}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer sponsored' : undefined}
          aria-label={ad.title}
          className="block"
        >
          <img src={resolveImage(ad.imageUrl)} alt={ad.title} className="h-auto max-h-48 w-full object-cover" />
        </a>
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Ad
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss advertisement"
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
