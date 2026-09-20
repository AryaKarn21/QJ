import { Link } from 'react-router-dom';
import React from 'react';

const TOKEN_RE = /(#[a-zA-Z][a-zA-Z0-9_]{0,49})|(@(?:company)?\[[^\]]{1,80}\]\([a-f0-9]{24}\))/g;

// Renders post/comment content, turning #hashtag, @[Name](userId) (person
// mention), and @company[Name](userId) (company mention — see
// MentionTextarea.tsx) tokens into real links instead of plain text. Kept
// as a single small component so PostCard and CommentSection render body
// text identically.
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(TOKEN_RE).filter((p) => p !== undefined && p !== '');

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^#[a-zA-Z]/.test(part)) {
          const tag = part.slice(1);
          return (
            <Link key={i} to={`/community/hashtag/${tag}`} className="text-primary font-medium hover:underline">
              {part}
            </Link>
          );
        }
        const mentionMatch = part.match(/^@(company)?\[([^\]]+)\]\(([a-f0-9]{24})\)$/);
        if (mentionMatch) {
          const [, isCompany, name, id] = mentionMatch;
          const to = isCompany ? `/community/company/${id}` : `/community/profile/${id}`;
          return (
            <Link key={i} to={to} className="text-primary font-medium hover:underline">
              @{name}
            </Link>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
