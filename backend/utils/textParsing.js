// Post/comment text uses two lightweight inline tokens, written by the
// frontend composer's hashtag/mention autocomplete:
//   #hashtag                      -> plain hashtag
//   @[Display Name](<userId>)     -> mention of a specific user
// This avoids needing a separate @username system (the User model has no
// username field) while still giving mentions a real, resolvable target
// instead of just highlighting arbitrary "@word" text.

const HASHTAG_RE = /#([a-zA-Z][a-zA-Z0-9_]{0,49})/g;
const MENTION_RE = /@\[([^\]]{1,80})\]\(([a-f0-9]{24})\)/g;

function extractHashtags(text) {
  if (!text) return [];
  const found = new Set();
  let match;
  HASHTAG_RE.lastIndex = 0;
  while ((match = HASHTAG_RE.exec(text)) !== null) {
    found.add(match[1].toLowerCase());
  }
  return Array.from(found);
}

function extractMentionIds(text) {
  if (!text) return [];
  const found = new Set();
  let match;
  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(text)) !== null) {
    found.add(match[2]);
  }
  return Array.from(found);
}

module.exports = { extractHashtags, extractMentionIds };
