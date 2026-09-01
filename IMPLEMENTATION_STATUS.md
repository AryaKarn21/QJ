# QuickJobs — Implementation Status

**Last updated:** 2026-08-30 (Phase 2 — Connections UI + Post Visibility)

Legend: `DONE` = built, wired into the UI, and automated-tested. `PARTIAL` = real but incomplete, or backend-only with no automated test. `NOT TESTED` = code exists but I have not run it against a live browser/database this session.

| Feature | Status |
|---|---|
| Authentication | DONE |
| Profiles | DONE |
| Follow | DONE |
| Connections (backend) | DONE |
| Connection Requests (backend) | DONE |
| My Connections Page | DONE |
| Connection Requests Page | DONE |
| People You May Know | DONE |
| Post Visibility (Public/Followers/Connections/Private) | DONE |
| Community Feed | DONE (visibility-filtered) |
| Posts | DONE |
| Comments | DONE (visibility-gated) |
| Reposts | DONE (visibility-safe) |
| Bookmarks | DONE (visibility-filtered) |
| Messaging | PARTIAL — works, but unrestricted (see §7 below) |
| Notifications | PARTIAL — core system DONE; 1 bug fixed, not exhaustively tested |
| Jobs | DONE (pre-existing, not re-audited this round) |
| Company Pages | DONE (pre-existing, not re-audited this round) |
| Blogs | DONE |
| FAQs | DONE |
| Career Tips | DONE |
| Legal Pages | DONE |
| Homepage CMS | DONE — Hero + closing CTA sections (see §10) |
| Admin | DONE (Security module fixed last round) |
| Responsive UI | NOT SYSTEMATICALLY TESTED |
| Capacitor | BROKEN (unchanged from last audit — see PROJECT_AUDIT.md §8) |
| Android readiness | BROKEN |
| iOS readiness | MISSING |
| Security | PARTIAL — reviewed once (see prior session), visibility enforcement added this round |

---

## What was done this phase, and how I know it works

### Priority 1 — My Connections Page
**Implemented.** `/community/connections` — search, pagination, loading/error/empty states, Message + Remove actions. Reuses `PersonCard` (extended with an optional action slot, not duplicated) and the already-built `connectionApi.ts`.
**Backend change:** `getMyConnections` rewritten from a two-step fetch to a single aggregation so server-side search (`?q=`) is possible without loading every connection into memory.
**Tested:** 3 new backend unit tests (empty state, populated state, search-term passthrough) — all passing. `tsc`/`eslint` clean. Production build passes.
**Not tested:** I have not clicked through this page in a real browser.

### Priority 2 — Connection Requests Page
**Implemented.** `/community/connections/requests` — Incoming/Sent tabs, Accept/Reject/Cancel actions, badge count on the Incoming tab.
**Backend change:** pending-list responses now include each row's `connectionId` (additive field) so the page can act on a row without a second lookup per person.
**Tested:** 1 new backend unit test for the `connectionId` inclusion. `tsc`/`eslint` clean.
**Not tested:** not exercised in a real browser.

### Priority 3 — People You May Know
**Implemented.** In the Community sidebar (`TrendingSidebar.tsx`, shown on the home feed and profile pages) — name, headline, mutual-connection count, Connect button that removes the person from the list on success.
**Verified against every requirement in the request:** excludes self/blocked/connected/pending (enforced server-side, in the already-tested `getSuggestions` backend function — nothing new to filter client-side).
**Gap vs. spec:** no explicit loading skeleton or "no suggestions" empty message — matches the existing sibling "People to follow" section's behavior (renders nothing until populated), not a new inconsistency I introduced, but worth flagging since the request asked for a loading state.

### Priority 4 — Post Visibility (the important one)
**Implemented and enforced server-side**, not just hidden in React:
- Added `"private"` to `Post.visibility` (previously only `public`/`followers`/`connections` existed — `private` was requested but didn't exist in the schema at all).
- New `utils/postVisibility.js` — one shared rule (`canViewPost`, `buildVisibilityFilter`) used by every read path, so `Follower ≠ Connection` is enforced identically everywhere instead of five different re-implementations.
- Wired into: feed (`getFeed`, all filter variants), company feed, profile feed, hashtag feed, single-post (`getPostById`), comments (`getComments`/`getReplies`/`addComment` — **previously had zero visibility check**, a real gap this closed), bookmarks, and both share paths (`sharePost`, `shareToUsers`).
- Added a visibility selector to the post composer — previously there was no way to actually create a non-public post through the UI at all.
- `getPostById` returns **404, not 403**, for a restricted post — a 403 would itself leak "this post exists but you can't see it."

**Tested — this is the part you explicitly asked to prove:**
- 13 unit tests on the core `canViewPost`/`buildVisibilityFilter` rule, including a dedicated test proving a follower who is NOT a connection is denied access to a connections-only post.
- 4 integration-style tests on `getPostById` itself (real controller code, mocked models) reproducing your exact scenario: User A posts connections-only → User B (not connected) gets a 404 with no post data in the response → User C (unrelated) also gets 404 → User B gets the real post once `Connection.exists` returns true → a private post is 404 for everyone but the author, including anonymous requests.
- Full backend suite: **78/78 passing.**
- **Not tested:** I have not run this against a live database with real User A/B/C accounts clicking through a browser — the CRITICAL TEST scenario's automated-test equivalent passed, but the literal manual walkthrough hasn't been performed. See the Testing Guide at the bottom of this doc for exact steps to do that yourself.

### Priority 5 — Feed Visibility (folded into Priority 4's work, not separate)
Specifically covered, since you called these out individually:
- **Feed endpoint:** fixed (query-level `$and` merge, pagination stays correct).
- **Single-post endpoint:** fixed (404 gate).
- **Comments:** fixed — this was a genuine gap (comments were never checked against the parent post's visibility before this).
- **Reposts:** fixed — this was the subtlest bug. A repost is its own Post document, usually `public` by default, that embeds the original's content via `sharedFrom`. Before this fix, resharing a connections-only post (by someone who could legitimately see it) created a **public** repost that leaked the original's full content to everyone, regardless of whether they could see the original. Now `sharedFrom` resolution re-checks the CURRENT viewer's access to the original post every time, and shows the same "unavailable" placeholder the UI already uses for deleted posts if they don't have access.
- **Bookmarks:** fixed — a bookmark can outlive the access you had to it (unfriended after bookmarking); now re-checked on every read.
- **Search:** there is no post-content search endpoint yet in this codebase (only hashtag search) — nothing to fix, noted so it isn't silently forgotten when one is eventually built.
- **Profile posts:** fixed (same query-level filter as the feed).

### Priority 6 — Profile Connection Information
**Implemented.** Own profile: a new "Connections" stat (linking to the My Connections page) alongside the existing Followers/Following counts. Someone else's profile: "N mutual connections" shown under their name when authenticated (reuses data the Connect button was already fetching — no extra request added).
**Deliberately not shown:** another person's *total* connection count on their profile — there's no backend support for that yet, and the request said "do not expose private information," so I didn't build a new capability to expose it without that being asked for explicitly.

### Priority 7 — Messaging Review (audit only — no code changed, as instructed)
1. **Can anyone message anyone?** Yes. `getOrCreateConversation`/`sendMessage` only check that the target user exists and isn't yourself — no follow, connection, or block check at all.
2. **Can only connections message?** No — see above.
3. **Existing privacy settings?** None. No "who can message me" field exists on the User model.
4. **Is messaging already working?** Yes — real Conversation/Message models, pagination, read receipts, unread counters.
5. **Notifications connected?** Yes — a `new_message` notification fires on every send.
6. **Is Socket.IO working?** Yes — room-based (`conversation:<id>`), real-time message delivery, typing indicators, and (as a bonus I hadn't previously flagged) full WebRTC call signaling (offer/answer/ICE/end/reject) already wired.
7. **Unread counts working?** Yes — a per-user counter on the Conversation document, incremented on send, zeroed on read.

**My recommendation, since you asked for one and said not to implement it without discussing first:** I'd go with **"Connections + existing conversations"** — block *starting* a new conversation with someone you're not connected to (and definitely someone who's blocked you), but never break a conversation that already exists, since that would be a confusing regression for real users mid-conversation. I have not implemented this — it's a real behavior change and I want your go-ahead first, per your own instruction.

### Priority 8 — Notifications Review
Audited every notification type actually used against the schema's allowed list. Found and fixed two real, confirmed bugs (not hypothetical):
- **`subscription_activated` was never a registered notification type** — every time a subscription payment completed, `sendNotification()` silently failed Mongoose validation and swallowed the error (by design, so a notification failure never crashes the payment flow) — meaning **no one has ever actually received this notification**. Added it to the schema.
- **That same notification's link pointed to `/subscription`, a route that doesn't exist** (the real routes are role-scoped: `/user/subscription` / `/employer/subscription`). Fixed to resolve the subscriber's role and link correctly.
- Checked every other notification type's `link` template against `App.tsx`'s actual routes — all others (post/profile/messages/employer-applicants/admin-employers/admin-jobs/settings/support) resolve correctly.
**Not tested:** the full create→appear→click→navigate loop wasn't run end-to-end in a browser.

### Priority 9 — CMS Audit
| CMS area | Status | Evidence |
|---|---|---|
| Blogs | DONE | Just re-verified: real `isPublished`/`publishedAt` fields, public list correctly filters to published-only, ownership-checked edit/delete, full-text search index. |
| FAQs | DONE | Confirmed in the prior audit — real model, admin CRUD, public read. |
| Career Tips | DONE | Same. |
| Legal Pages | DONE | Same — backed by the generic `Page` model. |

Nothing here needed fixing this round.

### Priority 10 — Homepage CMS
**Implemented**, scoped exactly as previously written up (see the original scoping note preserved below) — Hero section + closing CTA banner only.

**What was built:**
- `backend/models/HomepageContent.js` — a new **singleton** model (fixed `_id: "homepage"`, never more than one document) with typed fields for Hero (badge/headline/headline-accent/subheadline/both CTAs/popular-searches list) and the closing CTA section (badge/heading/heading-accent/both CTAs). Deliberately not a generic HTML blob like `Page.js` — Hero/CallToAction render each field with its own layout, so CMS controls the words, not the markup.
- Two GET endpoints on purpose: `GET /api/cms/homepage` (public — hides an unpublished draft, returns `{isPublished:false}`) and `GET /api/cms/homepage/admin` (admin-only — always returns the real saved draft, so the edit form can resume it even while unpublished). Caught this distinction myself mid-implementation — my first draft had the admin form reading the public endpoint, which would have made it impossible to ever see/edit a draft after unpublishing it.
- `PUT /api/cms/homepage` (admin-only) — upserts the singleton, `isPublished` toggle included.
- `CmsHub.tsx`'s Homepage tab — replaced the honest "not wired up yet" placeholder with a real form (all Hero + CTA fields, a Published/Unpublished toggle, Save button) — same `useQuery`/`useMutation`-free save pattern the existing Legal-pages tab already uses, not a new pattern.
- `Hero.tsx` and `CallToAction.tsx` — both now fetch published content on mount and use it if present; **the existing hardcoded copy is now the fallback**, not deleted — if nothing's published (or the request fails), the homepage looks exactly as it did before this change.

**Explicitly out of scope, and why** (unchanged from the original scoping):
- `Stats.tsx` ("Why Choose Us" feature grid) — each card's icon + internal route is coupled to its text; a text-only CMS field would be a half-measure without also making icons choosable, which is real added complexity for a component that isn't really "content" so much as "design."
- Featured Jobs / Career Tips / Community Highlights — already dynamic, pull from real APIs, nothing to CMS-ify.
- A numeric "10,000+ jobs" stats strip — doesn't exist on the homepage today; if built later it should be computed from real database counts, not admin-typed numbers (same "no fake numbers" rule enforced everywhere else in this app).

**One small, disclosed content change:** the CTA heading used to be three clauses ("Skill is more than a trait, *it's a foundation for excellence*, and a catalyst for meaningful impact.") — the CMS model has two editable fields (heading + accent), so the third clause was dropped from the default copy rather than hardcoded permanently alongside two CMS-editable ones. Cosmetic, but worth knowing about.

**Tested:**
- 4 new backend unit tests (unpublished → safe default, draft-hidden-from-public, published → full content, upsert coerces `isPublished` to a real boolean). Full suite: **82/82 passing.**
- `tsc --noEmit` and `eslint` clean on all 5 touched/new files — zero new lint debt (verified the same way as every other round this session: pre-existing errors elsewhere in the same files were confirmed unrelated by line-content, not just line-number).
- Full production build: succeeded, exit 0.
- **Not tested:** I have not opened the admin Homepage tab in a real browser, saved a draft, published it, and confirmed the actual homepage changes. That's the one real gap before calling this fully proven — see the testing guide below.

### Priorities 11-14 — Mobile, Capacitor, Environment Security, Testing
- **Mobile-first (11):** every new component this round uses the same responsive utility classes as the rest of the app (flex-wrap, no fixed widths); not tested at the specific breakpoints you listed — no browser access in this session.
- **Capacitor (12):** unchanged from the prior audit — still broken (native Android project exists on disk, zero `@capacitor/*` packages in `package.json`). Not touched this round; still needs your go-ahead since it's its own scoped fix.
- **Environment security (13):** no new env vars introduced this round. Nothing new to add to `.env.example`. No secrets were read into any file I wrote or printed in any response.
- **Testing (14):** every backend change this round has an automated test; every frontend change passed `tsc --noEmit`, `eslint`, and a full production build. See the exact test/build commands and counts in the sections above.

---

## Testing Guide — do this yourself to verify Priority 4 for real

```text
1.  cd backend && npm run dev
2.  cd frontend && npm run dev   (separate terminal)
3.  Open two browsers (or one + incognito).
4.  Register/login as User A in browser 1, User B in browser 2.
5.  As User A: open the composer, write a post, set the new visibility
    dropdown to "Connections only", post it.
6.  As User B: go to User A's profile feed. Confirm you do NOT see that post.
7.  Still as User B: note the post's id from User A's browser address bar
    (open the post directly as User A first: /community/post/<id>), then
    try opening that exact URL as User B. Confirm you get a "not found"
    result, not the post content.
8.  As User A: open User B's profile, click Connect.
9.  As User B: check the notification bell, click the request notification,
    click Accept.
10. As User B: revisit User A's profile feed. Confirm you NOW see the
    connections-only post.
11. As User A: remove the connection (My Connections page -> Remove).
12. As User B: refresh User A's profile feed. Confirm the post is gone
    from view again.
```

## Testing Guide — Priority 10 (Homepage CMS)

```text
1.  Log in as an admin. Go to /admin/cms, click the "Homepage" tab.
2.  Confirm it shows a real form now (Hero fields, CTA fields, a
    Published checkbox) instead of the old "not wired up yet" message.
3.  Change the Hero headline to something obviously different, e.g.
    "Testing Homepage CMS". Leave "Published" UNCHECKED. Click Save.
4.  Open the actual homepage (/) in another tab. Confirm it still shows
    the ORIGINAL headline — an unpublished draft must not go live.
5.  Back in the admin tab, check "Published". Click Save.
6.  Refresh the homepage. Confirm it now shows "Testing Homepage CMS".
7.  Go back to the admin tab, uncheck "Published", Save.
8.  Refresh the homepage again. Confirm it's back to the original
    hardcoded headline (not blank, not broken).
9.  Repeat steps 3-6 for the closing CTA section's heading, near the
    bottom of the homepage.
```
