/**
 * PATH: src/components/community/CommunityPostsPreview.tsx
 *
 * Full-width community section shown prominently on the Jobseeker Home
 * page and the Employer Dashboard.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Users, ArrowRight, Share2 } from 'lucide-react';
import { fetchFeed } from '../../api/communityApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import type { CommunityPost } from '../../types/community';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm'],
  ];
  for (const [secs, label] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return 'just now';
}

interface Props {
  variant?: 'employer' | 'jobseeker';
  limit?: number;
}

export function CommunityPostsPreview({ variant = 'jobseeker', limit = 3 }: Props) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const isEmployer = variant === 'employer';
  const accent = isEmployer ? '#F97316' : '#F97316';
  const accentLight = isEmployer ? '#FFF7ED' : '#FFF7ED';

  useEffect(() => {
    fetchFeed('latest', 1, limit)
      .then((res) => setPosts(res.posts.slice(0, limit)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <section style={{ background: '#fff', padding: '60px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          {/* Was a fixed `repeat(3, 1fr)` with no breakpoint at all — at
              360px that's ~88px-wide columns, badly broken. Tailwind's
              responsive grid classes replace the inline style so it can
              actually respond to viewport width. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 16, padding: 24, height: 200 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E5E7EB' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: '60%', marginBottom: 6 }} />
                    <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, width: '40%' }} />
                  </div>
                </div>
                <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, marginBottom: 8 }} />
                <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, width: '80%', marginBottom: 8 }} />
                <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, width: '60%' }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: '#fff', padding: '64px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* Section header — flex-wrap so the "View all posts" button drops
            below the heading on narrow screens instead of squeezing
            against it or forcing horizontal overflow; heading uses
            clamp() instead of a fixed 32px so it scales down on mobile. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 36 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: accentLight, borderRadius: 20, padding: '6px 14px', marginBottom: 12 }}>
              <Users size={14} color={accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Community
              </span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
              From the Community
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', marginTop: 8 }}>
              See what professionals are sharing, asking, and discussing.
            </p>
          </div>
          <Link
            to="/community"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: accent, color: '#fff', textDecoration: 'none',
              padding: '10px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600,
              boxShadow: `0 4px 14px ${accent}44`, whiteSpace: 'nowrap',
            }}
          >
            View All Posts <ArrowRight size={15} />
          </Link>
        </div>

        {/* Posts grid */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 15, color: '#9CA3AF' }}>
              No community posts yet.{' '}
              <Link to="/community" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>
                Be the first to share!
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const authorName = post.author?.name || post.company?.name || 'Anonymous';
              // AuthorSnapshot's field is `avatar` (see types/community.ts) —
              // this previously read `profilePic`/`logo`, which don't exist
              // on that type, so a real uploaded photo never showed here
              // (every post fell back to the initial-letter circle) even
              // though the exact same author data renders correctly with
              // a real photo everywhere else (PostCard, Avatar, Header).
              const authorPic = post.author?.avatar || post.company?.avatar || '';
              const picUrl = authorPic ? resolveMediaUrl(authorPic) : '';
              const initial = authorName.charAt(0).toUpperCase();

              return (
                <Link
                  key={post._id}
                  to={`/community/post/${post._id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div
                    style={{
                      background: '#FAFAFA',
                      border: '1px solid #E5E7EB',
                      borderRadius: 16,
                      padding: 24,
                      height: '100%',
                      boxSizing: 'border-box',
                      transition: 'all .18s',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = '#fff';
                      el.style.borderColor = accent;
                      el.style.boxShadow = `0 8px 32px ${accent}22`;
                      el.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = '#FAFAFA';
                      el.style.borderColor = '#E5E7EB';
                      el.style.boxShadow = 'none';
                      el.style.transform = 'none';
                    }}
                  >
                    {/* Author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {picUrl ? (
                        <img
                          src={picUrl}
                          alt={authorName}
                          style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E7EB', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                          background: `linear-gradient(135deg, ${accentLight}, ${accent}55)`,
                          border: `2px solid ${accent}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 800, color: accent,
                        }}>
                          {initial}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{authorName}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{timeAgo(post.createdAt)}</div>
                      </div>
                    </div>

                    {/* Content */}
                    <p style={{
                      fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0, flex: 1,
                      display: '-webkit-box', WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {post.content}
                    </p>

                    {/* Engagement footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#9CA3AF' }}>
                        <Heart size={14} color={post.likeCount ? accent : '#D1D5DB'} fill={post.likeCount ? `${accent}33` : 'none'} />
                        {post.likeCount ?? 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#9CA3AF' }}>
                        <MessageCircle size={14} />
                        {post.commentCount ?? 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#9CA3AF' }}>
                        <Share2 size={14} />
                        {post.shareCount ?? 0}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: accent }}>
                        Read more →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            to="/community"
            style={{
              fontSize: 14, fontWeight: 600, color: accent, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', border: `1.5px solid ${accent}`, borderRadius: 10,
              transition: 'all .15s',
            }}
          >
            <Users size={15} /> Join the community conversation
          </Link>
        </div>
      </div>
    </section>
  );
}