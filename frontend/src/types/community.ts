// Shared TypeScript shapes for the Community Feed module. Mirrors the
// backend's lean/hydrated Post & Comment response shapes (see
// backend/utils/postHydration.js and backend/utils/userDisplay.js) so the
// frontend never has to guess field names.

import type { ProfileStatus } from './profileStatus';

export type UserRole = 'jobseeker' | 'employer' | 'recruiter' | 'mentor' | 'admin' | 'superadmin';

export interface ProfileExperience {
  jobPosition?: string;
  institution?: string;
  duration?: string;
  companyId?: string | null;
  companyLogo?: string | null;
}

export interface ProfileQualification {
  degree?: string;
  institution?: string;
  year?: number;
}

export interface ProfileProject {
  _id?: string;
  title?: string;
  description?: string;
  link?: string;
  technologies?: string;
}

export interface ProfileCertification {
  _id?: string;
  name?: string;
  issuer?: string;
  year?: string;
}

// Pre-existing gap: referenced by AuthorSnapshot.memberships below but
// never defined — matches followController.js's getPublicProfile shape
// exactly (`profile.memberships = memberships.map(...)`).
export interface ProfileMembership {
  _id: string;
  designation?: string;
  department?: string;
  joinedAt?: string;
  status?: string;
  company?: { _id: string; name: string; companyLogo?: string | null } | null;
}

export interface ProfileExperience {
  jobPosition?: string;
  institution?: string;
  duration?: string;
  companyId?: string | null;
  companyLogo?: string | null;
  current?: boolean;
}

export interface AuthorSnapshot {
  _id: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  headline?: string;
  isVerified?: boolean;
  // Additive — populated by profile/followers/following endpoints only;
  // existing consumers (post cards, comments, mentions) don't set or
  // read these and are unaffected.
  bio?: string;
  socialLinks?: { linkedin?: string; twitter?: string; github?: string; website?: string } | null;
  joinedAt?: string | null;
  company?: string | null;
  // Additive — only set when `company` was resolved from a real,
  // verified CompanyMember row (see followController.js's
  // attachCurrentCompany), so it's safe to link to
  // `/community/company/:companyId`; absent means `company` (if any) came
  // from elsewhere and there's nothing to link to yet.
  companyId?: string | null;
  isFollowing?: boolean;
  // Jobseeker-only — populated by GET /community/follow/:userId/profile.
  qualifications?: ProfileQualification[];
  skills?: string[];
  experiences?: ProfileExperience[];
  resume?: string | null;
  memberships?: ProfileMembership[];
  coverPhoto?: string | null;
  projects?: ProfileProject[];
  certifications?: ProfileCertification[];
  // Employer-only "About" fields — populated by the same endpoint.
  description?: string;
  website?: string;
  industryType?: string;
  companySize?: string;
  address?: string;
  establishedDate?: string | null;
  // QuickJobs career/hiring status — null when the owner set visibility
  // to "private" and the viewer isn't them, or "network" and the viewer
  // isn't an accepted connection (see followController.js's
  // getVisibleProfileStatus). Absent entirely for non-jobseeker/employer
  // roles (admin, recruiter, mentor).
  profileStatus?: ProfileStatus | null;
}

export type PostType = 'text' | 'image' | 'video' | 'pdf' | 'job' | 'poll' | 'hiring';
export type PostTopic = 'career_tips' | 'interview_experience' | 'hiring' | 'general';
export type FeedFilter = 'latest' | 'trending' | 'hiring' | 'interview_experience' | 'career_tips' | 'following';

export interface PostMedia {
  url: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
}

export interface PollOption {
  _id: string;
  text: string;
  votes: string[];
}

export interface PollData {
  options: PollOption[];
  allowMultiple: boolean;
  expiresAt?: string;
}

export interface JobData {
  job?: string | null;
  title?: string;
  companyName?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  applyUrl?: string;
}

export interface HiringData {
  roles: string[];
  openings?: number;
  location?: string;
  urgency: 'normal' | 'urgent';
  applyUrl?: string;
  contactEmail?: string;
}

// Lightweight snapshot of the original post a share/repost points at —
// what backend/utils/postHydration.js now populates `sharedFrom` with
// (instead of a raw id) so the feed can render attribution without a
// second fetch. `isDeleted: true` means the original was soft-deleted;
// render a graceful "Original post unavailable" state rather than a link.
export interface SharedFromSnapshot {
  _id: string;
  isDeleted: boolean;
  author?: AuthorSnapshot;
  content?: string;
  media?: PostMedia[];
  type?: PostType;
  createdAt?: string;
}

export interface CommunityPost {
  _id: string;
  author: AuthorSnapshot;
  authorRole: UserRole;
  company?: AuthorSnapshot | null;
  type: PostType;
  content: string;
  media: PostMedia[];
  hashtags: string[];
  mentions: string[];
  topics: PostTopic[];
  visibility: 'public' | 'followers' | 'connections' | 'private';
  pollData?: PollData;
  jobData?: JobData;
  hiringData?: HiringData;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  viewCount: number;
  sharedFrom?: SharedFromSnapshot | null;
  aiGenerated: boolean;
  aiSummary?: string;
  moderation: { status: 'approved' | 'pending' | 'flagged' | 'removed'; flags: string[]; reason?: string };
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  viewer: { hasLiked: boolean; hasBookmarked: boolean };
}

export interface CommunityComment {
  _id: string;
  post: string;
  author: AuthorSnapshot;
  content: string;
  mentions: string[];
  parentComment: string | null;
  likeCount: number;
  replyCount: number;
  hasLiked: boolean;
  isEdited: boolean;
  createdAt: string;
}

export interface CommunityNotification {
  _id: string;
  type: string;
  message: string;
  actor?: AuthorSnapshot | null;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  _id: string;
  otherUser: AuthorSnapshot;
  lastMessage: { text: string; sender: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface DirectMessage {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
}