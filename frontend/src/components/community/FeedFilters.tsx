import type { FeedFilter } from '../../types/community';

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'trending', label: 'Trending' },
  { key: 'following', label: 'Following' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'interview_experience', label: 'Interview Experiences' },
  { key: 'career_tips', label: 'Career Tips' },
];

export function FeedFilters({ active, onChange }: { active: FeedFilter; onChange: (f: FeedFilter) => void }) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            active === f.key ? 'bg-primary text-light' : 'bg-light text-gray-600 hover:bg-secondary'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
