import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Users2, MapPin } from 'lucide-react';
import { fetchCompanyFeed } from '../../api/communityApi';
import { fetchPublicProfile, fetchFollowCounts } from '../../api/followApi';
import { getEmployeeCount } from '../../api/companyMemberApi';
import { useCurrentUser } from '../../utils/currentUser';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { FeedFilters } from './FeedFilters';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { TrendingSidebar } from './TrendingSidebar';
import { EmployeeSection } from './EmployeeSection';
import { CompanyAbout } from './CompanyAbout';
import { CompanyJobs } from './CompanyJobs';
import type { AuthorSnapshot, CommunityPost, FeedFilter } from '../../types/community';

export function CompanyFeed() {
  const { companyId } = useParams<{ companyId: string }>();
  const { userId } = useCurrentUser();
  const [profile, setProfile] = useState<AuthorSnapshot | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0, isFollowing: false });
  const [filter, setFilter] = useState<FeedFilter>('latest');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'jobs' | 'employees'>('posts');

  useEffect(() => {
    if (!companyId) return;
    fetchPublicProfile(companyId).then(setProfile).catch(() => setProfile(null));
    fetchFollowCounts(companyId).then(setCounts).catch(() => {});
    getEmployeeCount(companyId).then(setEmployeeCount).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchCompanyFeed(companyId, filter, 1)
      .then((res) => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [companyId, filter]);

  const loadMore = async () => {
    if (!companyId) return;
    const next = page + 1;
    const res = await fetchCompanyFeed(companyId, filter, next);
    setPosts((prev) => [...prev, ...res.posts]);
    setHasMore(res.hasMore);
    setPage(next);
  };

  if (!companyId) return null;
  const isOwnCompany = userId === companyId;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Company header card */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-light shadow-card">
        {/* Cover/banner — same gradient fallback as the employer dashboard's
            edit modal (EditProfileModal.tsx) when no cover photo is set. */}
        <div className="h-28 sm:h-36 w-full">
          {profile?.coverPhoto ? (
            <img src={resolveMediaUrl(profile.coverPhoto)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 p-5 -mt-8">
          <div className="rounded-md bg-white ring-4 ring-white shrink-0">
            {profile ? <Avatar user={profile} size={16} /> : <div className="h-16 w-16 animate-pulse rounded-md bg-secondary" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 truncate text-lg font-bold text-dark">
              <Building2 size={17} className="text-primary" /> {profile?.name || 'Loading…'}
            </h1>
            {profile?.industryType ? (
              <p className="text-sm text-gray-500">{profile.industryType}</p>
            ) : profile?.headline ? (
              <p className="text-sm text-gray-500">{profile.headline}</p>
            ) : null}
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <p className="text-xs text-gray-400">
                {counts.followers} follower{counts.followers === 1 ? '' : 's'}
              </p>
              <span className="text-gray-300">·</span>
              <button
                onClick={() => setActiveTab('employees')}
                className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Users2 size={12} className="text-primary" />
                {employeeCount} employee{employeeCount === 1 ? '' : 's'}
              </button>
              {profile?.address && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={12} /> {profile.address}
                  </span>
                </>
              )}
            </div>
          </div>
          {!isOwnCompany && (
            <FollowButton
              userId={companyId}
              initialFollowing={counts.isFollowing}
              isCompany
              onChange={(f) => setCounts((c) => ({ ...c, isFollowing: f, followers: c.followers + (f ? 1 : -1) }))}
            />
          )}
        </div>

        {/* Tabs — this card no longer has a blanket p-5 (moved onto just
            the avatar row above, so the cover banner can bleed to the
            edges), so this row needs its own horizontal/bottom padding. */}
        <div className="mt-4 flex overflow-x-auto border-t border-gray-100 px-5 pt-3 pb-5 gap-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'posts' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-secondary'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'about' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-secondary'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'jobs' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-secondary'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'employees' ? 'bg-primary text-white' : 'text-gray-500 hover:bg-secondary'
            }`}
          >
            <Users2 size={13} />
            People
            {employeeCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === 'employees' ? 'bg-white/20' : 'bg-primary/10 text-primary'
              }`}>
                {employeeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'employees' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <EmployeeSection companyId={companyId} companyName={profile?.name} />
          </div>
          <aside className="hidden lg:block">
            <TrendingSidebar />
          </aside>
        </div>
      ) : activeTab === 'about' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <CompanyAbout companyId={companyId} />
          </div>
          <aside className="hidden lg:block">
            <TrendingSidebar />
          </aside>
        </div>
      ) : activeTab === 'jobs' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <CompanyJobs companyId={companyId} />
          </div>
          <aside className="hidden lg:block">
            <TrendingSidebar />
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <FeedFilters active={filter} onChange={setFilter} />
            {isOwnCompany && (
              <PostComposer
                defaultCompanyId={companyId}
                onPosted={(post) => setPosts((prev) => [post, ...prev])}
              />
            )}
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading posts…</p>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
                <p className="text-sm text-gray-500">This company hasn't posted anything yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))} />
                ))}
              </div>
            )}
            {hasMore && !loading && (
              <button onClick={loadMore} className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-primary hover:bg-secondary">
                Load more
              </button>
            )}
          </div>
          <aside className="hidden lg:block">
            <TrendingSidebar />
          </aside>
        </div>
      )}
    </div>
  );
}