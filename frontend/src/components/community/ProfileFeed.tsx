import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Calendar, Globe, Linkedin, Github, Twitter, MapPin, Pencil, MessageCircle, MessageSquare, Phone, Video, UserPlus, Users, Users2, Building2,
  Award, FolderKanban, GraduationCap, Briefcase, Sparkles, ExternalLink, Eye, BarChart3, Search, FolderPlus, X,
} from 'lucide-react';
import { fetchUserFeed } from '../../api/communityApi';
import { fetchPublicProfile, fetchFollowCounts } from '../../api/followApi';
import { openConversationWith } from '../../api/messageApi';
import { updateJobseekerProfile, updateJobseekerCareerStatus } from '../../components/jobseeker/jobseekerApi/api';
import { updateEmployerProfile, updateEmployerHiringStatusApi } from '../../components/employer/employerApi/api';
import { useCurrentUser } from '../../utils/currentUser';
import { useCall } from '../../context/CallContext';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { addRecentlyViewedProfile } from '../../utils/recentSearches';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { ConnectionButton } from './ConnectionButton';
import { CoverPhotoEditor } from './CoverPhotoEditor';
import { getMyConnections, type ConnectionStatus } from '../../api/connectionApi';
import { recordProfileView, getMyProfileViewCount } from '../../api/profileViewApi';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { TrendingSidebar } from './TrendingSidebar';
import { ProfileStatusBadge } from '../common/profileStatus/ProfileStatusBadge';
import { ProfileStatusEditor } from '../common/profileStatus/ProfileStatusEditor';
import type { AuthorSnapshot, CommunityPost } from '../../types/community';

// Shared card shell for the About/Skills/Experience/Education/Projects/
// Certifications sections below — same "white rounded-2xl border" chrome
// the rest of this page already uses, factored out once instead of
// repeated per section.
function ProfileSection({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

export function ProfileFeed() {
  const { userId: profileId } = useParams<{ userId: string }>();
  const { userId: viewerId, isAuthenticated } = useCurrentUser();
  const navigate = useNavigate();
  const { startCall } = useCall();
  const [profile, setProfile] = useState<AuthorSnapshot | null>(null);

  const handleOpenMessage = async () => {
    if (!profileId) return;
    try {
      const conv = await openConversationWith(profileId);
      navigate(`/messages/${conv._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not open conversation.');
    }
  };

  const handleStartAudioCall = () => {
    if (!profileId || !profile) return;
    startCall(
      profileId,
      'audio',
      profile.name || 'User',
      resolveMediaUrl(profile.avatar)
    );
  };

  const handleStartVideoCall = () => {
    if (!profileId || !profile) return;
    startCall(
      profileId,
      'video',
      profile.name || 'User',
      resolveMediaUrl(profile.avatar)
    );
  };
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [dismissSuggested, setDismissSuggested] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0, isFollowing: false });
  // mutualConnections: only meaningful on someone ELSE's profile, filled
  // in by ConnectionButton's onStatusChange (it already computes this on
  // every status check — no extra request). connectionsTotal: only shown
  // on your OWN profile, since /community/connections is always "my own"
  // connections — there's no per-profile connections list to link to.
  const [mutualConnections, setMutualConnections] = useState<number | null>(null);
  // Only rendered for jobseeker profiles (see ConnectionButton below) —
  // null means "not a jobseeker profile" or "not loaded yet", in which
  // case the Message button falls back to its pre-existing unconditional
  // behavior (employer profiles aren't part of the Connection system).
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connectionsTotal, setConnectionsTotal] = useState<number | null>(null);
  const [profileViewsTotal, setProfileViewsTotal] = useState<number | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    fetchPublicProfile(profileId).then(setProfile).catch(() => setProfile(null));
    fetchFollowCounts(profileId).then(setCounts).catch(() => {});
  }, [profileId]);

  // Feeds the header search's "Recent" people row (LinkedIn-style) — real
  // browsing history only, per-browser via localStorage, never your own
  // profile (not useful to see yourself in "recently viewed"). Same guard
  // also gates the profile-view record below — both only make sense on an
  // actual visit to someone else's profile, not a self-view.
  useEffect(() => {
    if (!profileId || profileId === viewerId) return;
    addRecentlyViewedProfile(profileId);
    if (isAuthenticated) recordProfileView(profileId);
  }, [profileId, viewerId, isAuthenticated]);

  // Own-profile-only: total profile-view count for the stats row.
  useEffect(() => {
    if (!profileId || !viewerId || viewerId !== profileId) return;
    getMyProfileViewCount().then(setProfileViewsTotal).catch(() => {});
  }, [profileId, viewerId]);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    fetchUserFeed(profileId, 1)
      .then((res) => {
        setPosts(res.posts);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  // Own-profile-only: total connection count for the stats row. Not
  // fetched for someone else's profile — there's no per-profile
  // connections list to link to (see the state declaration above).
  useEffect(() => {
    if (!profileId || !viewerId || viewerId !== profileId) return;
    getMyConnections({ page: 1 })
      .then((res) => setConnectionsTotal(res.total))
      .catch(() => {});
  }, [profileId, viewerId]);

  // Cover photo lives on a different discriminator (Jobseeker vs Employer)
  // with a different response shape per role's own update endpoint, so the
  // upload/remove calls branch on role here — CoverPhotoEditor itself
  // stays role-agnostic (just an onUpload/onRemove pair).
  const handleCoverUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('coverPhoto', file);
    if (profile?.role === 'employer') {
      const res = await updateEmployerProfile(formData);
      setProfile((prev) => (prev ? { ...prev, coverPhoto: res?.coverPhoto ?? prev.coverPhoto } : prev));
    } else {
      const res = await updateJobseekerProfile(formData);
      setProfile((prev) => (prev ? { ...prev, coverPhoto: res.jobseeker?.coverPhoto ?? prev.coverPhoto } : prev));
    }
  };

  const handleCoverRemove = async () => {
    const formData = new FormData();
    formData.append('removeCoverPhoto', 'true');
    if (profile?.role === 'employer') {
      await updateEmployerProfile(formData);
    } else {
      await updateJobseekerProfile(formData);
    }
    setProfile((prev) => (prev ? { ...prev, coverPhoto: null } : prev));
  };

  const loadMore = async () => {
    if (!profileId) return;
    const next = page + 1;
    const res = await fetchUserFeed(profileId, next);
    setPosts((prev) => [...prev, ...res.posts]);
    setHasMore(res.hasMore);
    setPage(next);
  };

  if (!profileId) return null;
  const isOwnProfile = viewerId === profileId;
  // The generic "Edit Profile" affordances on this page (not the
  // jobseeker-only per-section ones further down, which are always
  // jobseeker) need to route to whichever role's own edit page actually
  // exists — an employer clicking this previously landed on the
  // jobseeker profile editor.
  const ownEditProfilePath = profile?.role === 'employer' ? '/employer/profile' : '/user/profile';

  // Jobseeker-only: highlight the experience marked "current", falling
  // back to the most recently added entry — same logic as the private
  // profile page (src/components/jobseeker/user/profile.tsx) so both
  // views agree on what "currently working at" means.
  const currentJob =
    profile?.role === 'jobseeker' && profile.experiences && profile.experiences.length > 0
      ? profile.experiences.find((e) => e.current) || profile.experiences[profile.experiences.length - 1]
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Profile Card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Banner — a real per-user cover photo when set, falling back to
            the QuickJobs-branded gradient for every profile that hasn't
            set one. Owner-only upload/replace/remove controls; visitors
            (isOwnProfile=false) get the exact same banner with none of
            them, enforced by the `editable` prop, not just CSS hiding —
            the underlying upload/remove calls are also self-only
            server-side (see jobseekerController/employerController). */}
        <div className="relative">
          <CoverPhotoEditor
            coverPhoto={profile?.coverPhoto}
            editable={Boolean(isOwnProfile && (profile?.role === 'jobseeker' || profile?.role === 'employer'))}
            onUpload={handleCoverUpload}
            onRemove={handleCoverRemove}
          />
          {/* Edit banner button for own profile */}
          {isOwnProfile && (
            <button
              onClick={() => navigate(ownEditProfilePath)}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/20 hover:bg-black/30 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
            >
              <Pencil size={11} /> Edit Profile
            </button>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + action buttons row */}
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-16 mb-5">
            <div className="relative">
              {profile ? (
                <div className="rounded-full ring-[3px] ring-white shadow-xl">
                  <Avatar user={profile} size={24} />
                </div>
              ) : (
                <div className="h-24 w-24 animate-pulse rounded-full bg-gray-200 ring-[3px] ring-white" />
              )}
              {/* Role badge — cleaner pill, uses a softer tone */}
              {profile?.role && (
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2.5 py-0.5 rounded-full border-2 border-white capitalize shadow-sm ${
                  profile.role === 'employer' ? 'bg-blue-600 text-white'
                  : profile.role === 'jobseeker' ? 'bg-primary text-white'
                  : 'bg-gray-600 text-white'
                }`}>
                  {profile.role === 'jobseeker' ? 'Jobseeker' : profile.role}
                </span>
              )}
            </div>

            {!isOwnProfile && isAuthenticated && (
              <div className="flex flex-wrap items-center gap-2 pb-1">
                {/* Connect (mutual approval) and Follow (one-way) */}
                {profile?.role !== 'employer' && (
                  <ConnectionButton
                    userId={profileId!}
                    onStatusChange={(status, mutualCount) => {
                      setConnectionStatus(status);
                      setMutualConnections(mutualCount);
                    }}
                  />
                )}
                <FollowButton
                  userId={profileId}
                  initialFollowing={counts.isFollowing}
                  isCompany={profile?.role === 'employer'}
                  onChange={(f) =>
                    setCounts((c) => ({ ...c, isFollowing: f, followers: c.followers + (f ? 1 : -1) }))
                  }
                />

                {/* Instant Real-Time Messaging */}
                <button
                  onClick={handleOpenMessage}
                  className="flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-dark text-white px-4 py-2 text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Send Message"
                >
                  <MessageSquare size={15} />
                  <span>Message</span>
                </button>

                {/* WebRTC Voice Call */}
                <button
                  onClick={handleStartAudioCall}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 hover:border-emerald-400 text-emerald-700 px-3.5 py-2 text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Start Voice Call"
                >
                  <Phone size={15} className="text-emerald-600" />
                  <span className="hidden sm:inline">Call</span>
                </button>

                {/* WebRTC Video Call */}
                <button
                  onClick={handleStartVideoCall}
                  className="flex items-center gap-1.5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-300 hover:border-blue-400 text-blue-700 px-3.5 py-2 text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Start Video Call"
                >
                  <Video size={15} className="text-blue-600" />
                  <span className="hidden sm:inline">Video</span>
                </button>
              </div>
            )}

            {!isOwnProfile && !isAuthenticated && (
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary-dark text-white px-4 py-2 text-sm font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>Sign in to Message</span>
                </button>
              </div>
            )}

            {isOwnProfile && (
              <button
                onClick={() => navigate(ownEditProfilePath)}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5 px-5 py-2 text-sm font-semibold text-gray-700 transition-all shadow-sm"
              >
                <Pencil size={13} /> Edit Profile
              </button>
            )}
          </div>

          {/* Name + headline */}
          <div className="mb-4">
            {profile ? (
              <>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 leading-tight">
                  {profile.name}
                  {profile.isVerified && (
                    <span title="Verified" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex-shrink-0">
                      ✓
                    </span>
                  )}
                </h1>
                {(profile.role === 'jobseeker' || profile.role === 'employer') && (
                  <div className="mt-1">
                    <ProfileStatusBadge
                      profileStatus={profile.profileStatus}
                      editable={isOwnProfile}
                      onEdit={() => setShowStatusEditor(true)}
                      size="sm"
                    />
                  </div>
                )}
                {!isOwnProfile && mutualConnections !== null && mutualConnections > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mutualConnections} mutual connection{mutualConnections === 1 ? '' : 's'}
                  </p>
                )}
                {profile.headline && (
                  <p className="text-sm text-gray-600 mt-0.5">{profile.headline}</p>
                )}
                {currentJob && (currentJob.jobPosition || currentJob.institution) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                    <Building2 size={13} className="text-primary shrink-0" />
                    <span>
                      {profile.experiences?.some((e) => e.current) ? 'Currently working as ' : 'Recently worked as '}
                      <span className="font-semibold">{currentJob.jobPosition || 'a professional'}</span>
                      {currentJob.institution && (
                        <>
                          {' '}at{' '}
                          {currentJob.companyId ? (
                            <Link to={`/community/company/${currentJob.companyId}`} className="font-semibold hover:underline">
                              {currentJob.institution}
                            </Link>
                          ) : (
                            <span className="font-semibold">{currentJob.institution}</span>
                          )}
                        </>
                      )}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
              </div>
            )}
          </div>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 mb-4">
            {profile?.role === 'employer' && profile?.company && (
              <span className="flex items-center gap-1">
                <Users size={12} /> {profile.company}
              </span>
            )}
            {profile?.joinedAt && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Joined {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            )}
            {profile?.role === 'employer' && profile?.address && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {profile.address}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start sm:gap-x-6 mb-5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <Link
              to={`/community/profile/${profileId}/followers`}
              className="flex flex-col items-center hover:text-primary transition-colors group"
            >
              <span className="text-lg font-bold text-gray-900 group-hover:text-primary">{counts.followers}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <UserPlus size={11} /> Follower{counts.followers === 1 ? '' : 's'}
              </span>
            </Link>
            <div className="hidden h-8 w-px bg-gray-200 sm:block" />
            <Link
              to={`/community/profile/${profileId}/following`}
              className="flex flex-col items-center hover:text-primary transition-colors group"
            >
              <span className="text-lg font-bold text-gray-900 group-hover:text-primary">{counts.following}</span>
              <span className="text-xs text-gray-500">Following</span>
            </Link>
            {isOwnProfile && connectionsTotal !== null && (
              <>
                <div className="hidden h-8 w-px bg-gray-200 sm:block" />
                <Link
                  to="/community/connections"
                  className="flex flex-col items-center hover:text-primary transition-colors group"
                >
                  <span className="text-lg font-bold text-gray-900 group-hover:text-primary">{connectionsTotal}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users2 size={11} /> Connection{connectionsTotal === 1 ? '' : 's'}
                  </span>
                </Link>
              </>
            )}
            {isOwnProfile && profileViewsTotal !== null && (
              <>
                <div className="hidden h-8 w-px bg-gray-200 sm:block" />
                <Link
                  to="/community/profile-views"
                  className="flex flex-col items-center hover:text-primary transition-colors group"
                >
                  <span className="text-lg font-bold text-gray-900 group-hover:text-primary">{profileViewsTotal}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Eye size={11} /> Profile View{profileViewsTotal === 1 ? '' : 's'}
                  </span>
                </Link>
              </>
            )}
            <div className="hidden h-8 w-px bg-gray-200 sm:block" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-500">Post{posts.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* Social links */}
          {profile?.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
            <div className="flex flex-wrap items-center gap-2">
              {profile.socialLinks.linkedin && (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#0077B5] bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
              {profile.socialLinks.twitter && (
                
                <a
                  href={profile.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#1DA1F2] bg-gray-100 hover:bg-sky-50 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Twitter size={13} /> Twitter
                </a>
              )}
              {profile.socialLinks.github && (
                <a
                  href={profile.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Github size={13} /> GitHub
                </a>
              )}
              {profile.socialLinks.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary bg-gray-100 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Globe size={13} /> Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feed + Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* LinkedIn-style: Suggested for you (Private to you) */}
          {isOwnProfile && !dismissSuggested && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Suggested for you</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                    <Eye size={12} className="text-gray-400" /> Private to you
                  </p>
                </div>
                <button
                  onClick={() => setDismissSuggested(true)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Dismiss suggestion"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 shadow-sm">
                  <FolderPlus size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {!profile?.projects || profile.projects.length === 0
                      ? 'Add projects that showcase your skills'
                      : !profile?.skills || profile.skills.length === 0
                      ? 'Add skills to get discovered by recruiters'
                      : 'Keep your experience & qualifications updated'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {!profile?.projects || profile.projects.length === 0
                      ? 'Show recruiters how you put your skills to use by adding projects to your profile.'
                      : !profile?.skills || profile.skills.length === 0
                      ? 'Highlight your strongest technical and interpersonal skills to get matched with top opportunities.'
                      : 'Adding regular career milestones boosts your profile discovery by up to 3x.'}
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => navigate(ownEditProfilePath)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-800 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
                    >
                      {!profile?.projects || profile.projects.length === 0
                        ? 'Add a project'
                        : !profile?.skills || profile.skills.length === 0
                        ? 'Add skills'
                        : 'Edit profile'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LinkedIn-style: Analytics (Private to you) */}
          {isOwnProfile && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900">Analytics</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 font-medium">
                  <Eye size={12} className="text-gray-400" /> Private to you
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  to="/community/profile-views"
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 group-hover:text-primary">
                      {profileViewsTotal !== null ? profileViewsTotal : 0} profile views
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">Discover who's viewed your profile.</p>
                  </div>
                </Link>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="mt-0.5 p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <BarChart3 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900">
                      {posts.length} post updates
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">Check out who's engaging with your posts.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="mt-0.5 p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Search size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900">
                      {connectionsTotal !== null ? connectionsTotal : counts.followers} network reach
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">See your footprint across searches.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About */}
          {(profile?.bio || isOwnProfile) && (
            <ProfileSection title="About" icon={<Sparkles size={14} className="text-primary" />}>
              {profile?.bio ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{profile.bio}</p>
              ) : (
                <p className="text-sm text-gray-400">
                  Add a short summary about yourself from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {/* Experience — full history, not just the "currently working as"
              summary line in the header above. */}
          {profile?.role === 'jobseeker' && ((profile.experiences && profile.experiences.length > 0) || isOwnProfile) && (
            <ProfileSection title="Experience" icon={<Briefcase size={14} className="text-primary" />}>
              {profile.experiences && profile.experiences.length > 0 ? (
                <ul className="space-y-4">
                  {profile.experiences.map((exp, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Briefcase size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{exp.jobPosition || 'Role'}</p>
                        {exp.institution && (
                          <p className="text-sm text-gray-600">
                            {exp.companyId ? (
                              <Link to={`/community/company/${exp.companyId}`} className="hover:underline">{exp.institution}</Link>
                            ) : exp.institution}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {exp.duration}{exp.current && <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-600">Current</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  Add your work history from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {/* Education — reuses the existing `qualifications` field, which
              already has exactly the degree/institution/year shape a
              LinkedIn-style Education section needs (no separate/duplicate
              field added). */}
          {profile?.role === 'jobseeker' && ((profile.qualifications && profile.qualifications.length > 0) || isOwnProfile) && (
            <ProfileSection title="Education" icon={<GraduationCap size={14} className="text-primary" />}>
              {profile.qualifications && profile.qualifications.length > 0 ? (
                <ul className="space-y-3">
                  {profile.qualifications.map((q, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <GraduationCap size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{q.degree || 'Qualification'}</p>
                        <p className="text-sm text-gray-600">{q.institution}{q.year ? ` · ${q.year}` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  Add your education from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {/* Skills */}
          {profile?.role === 'jobseeker' && ((profile.skills && profile.skills.length > 0) || isOwnProfile) && (
            <ProfileSection title="Skills" icon={<Award size={14} className="text-primary" />}>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-gray-700">{skill}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Add your skills from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {/* Projects */}
          {profile?.role === 'jobseeker' && ((profile.projects && profile.projects.length > 0) || isOwnProfile) && (
            <ProfileSection title="Projects" icon={<FolderKanban size={14} className="text-primary" />}>
              {profile.projects && profile.projects.length > 0 ? (
                <ul className="space-y-4">
                  {profile.projects.map((p, i) => (
                    <li key={p._id || i}>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900">{p.title || 'Untitled project'}</p>
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      {p.description && <p className="mt-0.5 text-sm text-gray-600">{p.description}</p>}
                      {p.technologies && <p className="mt-1 text-xs text-gray-400">{p.technologies}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  Add your projects from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {/* Certifications */}
          {profile?.role === 'jobseeker' && ((profile.certifications && profile.certifications.length > 0) || isOwnProfile) && (
            <ProfileSection title="Certifications" icon={<Award size={14} className="text-primary" />}>
              {profile.certifications && profile.certifications.length > 0 ? (
                <ul className="space-y-3">
                  {profile.certifications.map((c, i) => (
                    <li key={c._id || i}>
                      <p className="text-sm font-semibold text-gray-900">{c.name || 'Certification'}</p>
                      <p className="text-sm text-gray-600">{[c.issuer, c.year].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  Add your certifications from{' '}
                  <button onClick={() => navigate('/user/profile')} className="font-medium text-primary hover:underline">Edit Profile</button>.
                </p>
              )}
            </ProfileSection>
          )}

          {isOwnProfile && profile && (
            <PostComposer
              onPosted={(post) => setPosts((prev) => [post, ...prev])}
              currentUserSnapshot={{ name: profile.name, avatar: profile.avatar, role: profile.role }}
            />
          )}

          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Activity</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-28 rounded bg-gray-200" />
                      <div className="h-3 w-20 rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-gray-100 w-full" />
                    <div className="h-3 rounded bg-gray-100 w-5/6" />
                    <div className="h-3 rounded bg-gray-100 w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {isOwnProfile ? "Share your first update" : "No posts yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isOwnProfile ? "Career updates, tips, and opportunities go here." : `${profile?.name} hasn't posted anything yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
                />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={loadMore}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              Load more posts
            </button>
          )}
        </div>

        <aside className="hidden lg:block">
          <TrendingSidebar />
        </aside>
      </div>

      {isOwnProfile && (profile?.role === 'jobseeker' || profile?.role === 'employer') && (
        <ProfileStatusEditor
          open={showStatusEditor}
          onClose={() => setShowStatusEditor(false)}
          statusType={profile?.role === 'employer' ? 'EMPLOYER' : 'JOB_SEEKER'}
          currentStatus={profile?.profileStatus}
          onSave={(payload) =>
            profile?.role === 'employer'
              ? updateEmployerHiringStatusApi(payload).then((res) => res.profileStatus)
              : updateJobseekerCareerStatus(payload).then((res) => res.profileStatus)
          }
          onSaved={(updated) => setProfile((p) => (p ? { ...p, profileStatus: updated } : p))}
        />
      )}
    </div>
  );
}