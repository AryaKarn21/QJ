# QuickJobs — Project Audit

**Original date:** 2026-08-30 · **Phase 2 update:** 2026-08-30 (later same day)
**Method:** Every claim below was checked by reading the actual source file(s), running `tsc`/`eslint`/`jest`/`vite build`, or grepping for the exact code path — not guessed from file names. Where I only confirmed a file/route *exists* but didn't read its full logic, I say so explicitly instead of guessing.

**Status key:** `DONE` (built, wired, and I verified the code path) · `PARTIAL` (real but incomplete) · `PLACEHOLDER` (UI/route exists, backend intentionally not built — the codebase itself says so) · `BROKEN` (wired but doesn't actually work) · `MISSING` (no model/route/component at all)

---

## Phase 2 update — what changed since the original audit below

The sections below (§1-§10) are the **original, unmodified** audit — kept as-is so you can see what was true before Phase 2 started. Two of its findings are now out of date; everything else still stands:

- **§5/§6 "Post visibility is BROKEN, no Connection model exists"** — both fixed. A full Connection system was built (model, controller, routes, and now a My Connections page, Connection Requests page, and People You May Know widget), and post visibility (Public/Followers/Connections/Private) is now enforced server-side across every read path — feed, single post, comments, reposts, and bookmarks. Full detail in `IMPLEMENTATION_STATUS.md`, which is now the up-to-date, feature-by-feature status document — check there first, not here, for current status.
- **§4 "Homepage CMS is a PLACEHOLDER"** — fixed. Hero + closing CTA sections are now real, admin-editable content (`HomepageContent` model, `CmsHub.tsx`'s Homepage tab, publish/unpublish toggle) with the original hardcoded copy kept as the fallback. `Stats.tsx`'s feature grid and the real dynamic sections (Featured Jobs/Career Tips/Community) were deliberately left out — see `IMPLEMENTATION_STATUS.md`'s Priority 10 section for why.
- **Two more real bugs found and fixed along the way** (not part of the original audit, found during Phase 2): a `subscription_activated` notification type that was never registered in the schema (silently failing every time), and its notification link pointing to a route that didn't exist.
- Everything else below — Capacitor being broken, the two admin dead-nav-links, messaging having no access restriction, etc. — is **still accurate**, not yet addressed.

**Updated recommended order** (supersedes §9's original list — its first three items are now done): (1) decide on the messaging-restriction question from `IMPLEMENTATION_STATUS.md`'s Priority 7 section — a real product decision, not mine to make silently; (2) fix Capacitor's dependency mismatch — quick, low-risk, unblocks mobile; (3) the smaller remaining items (admin dead nav links, post reporting, CMS media library/SEO fields).

---

## 1. Frontend

| Area | What it is |
|---|---|
| Framework | React 18 + TypeScript + Vite, Tailwind CSS |
| Routing | `react-router-dom` v6, one central route table in `frontend/src/App.tsx` |
| State | React Query (`@tanstack/react-query`) for server data; React Context for cross-cutting state (`SocketContext`, `FollowContext`, `AdminUIContext`) — no Redux |
| API layer | `frontend/src/api/*.ts` — one file per backend feature area (`followApi.ts`, `communityApi.ts`, `subscriptionApi.ts`, etc.), all using `axios` + a shared `Authorization: Bearer` helper. This is a real, consistently-followed pattern — **not** scattered `fetch()` calls. |
| Auth | JWT in `localStorage`, decoded client-side with `jwt-decode` for role checks, `ProtectedRoute` component gates role-restricted routes |
| Community UI | `HomeFeed`, `CompanyFeed`, `ProfileFeed`, `HashtagFeed`, `PostDetailPage`, `FollowersPage`/`FollowingPage`, `PostComposer`, `PostCard`, `CommentSection`, `PollWidget`, `ShareModal`, `TrendingSidebar`, `MentionTextarea` — this list is substantial, not a stub |
| CMS UI | `CmsHub.tsx` (admin) — tabs for Blogs, FAQs, Career Tips, Legal pages, **and a Homepage tab that is a deliberate placeholder** (see §4) |
| Admin UI | `AdminShell` + `Sidebar` with 7 nav groups (Overview/People/Hiring/Monetization/Intelligence/Content/Platform) — most links resolve to real pages; a couple are dead (see §7) |
| Messaging UI | `MessagesPage.tsx`, plus a `CallOverlay.tsx` + `useWebRTC.ts` — **there is partial voice/video calling UI already present**, worth knowing about even though I didn't verify it end-to-end |
| Notification UI | `NotificationBell.tsx` exists; not verified against unread-count/mark-all-read behavior this pass |
| Job UI | Listing, detail, apply, post-job, applicants — present, not re-audited this pass (verified in an earlier session) |
| Profile UI | Jobseeker/Employer profile pages — present; no separate "Recruiter"/"Mentor" profile UI yet (see §3) |

## 2. Backend

Express + Mongoose, `backend/server.js` is the entry point.

| Count | What |
|---|---|
| 32 | Mongoose models |
| 28 | Controllers |
| 23 | Route files, all mounted in `server.js` |
| 4 | Service modules: `atsAnalysis.service.js`, `resumeAI.service.js`, `payment/esewaService.js`, `payment/khaltiService.js` |
| 8 | Middleware files: auth, 3 different upload middlewares (user/community/application/icon), rate limiters, input sanitization, safe-extension helper |

**Auth/authorization** (re-verified this session, see the security-review notes folded into §6): JWT-based, bcrypt password hashing, account lockout after 5 failed logins, rate limiting on login/OTP endpoints, role middleware (`authorizeAdmin`, `authorizeRoles`, etc.), a real `SAFE_USER_FIELDS` blocklist + `PUBLIC_PROFILE_FIELDS` allowlist to stop sensitive-field leakage. This is genuinely solid, deliberate work — not naive scaffolding.

**AI integrations:** one shared Gemini client (`utils/geminiClient.js`) used by community AI (captions/grammar/summarize/moderation/hiring-detect/job-recs), resume AI, blog AI, and the new chatbot. All degrade gracefully (503, not a crash) when `GEMINI_API_KEY` is unset. API key never reaches the frontend.

**Socket.IO:** `utils/socket.js` — real-time layer for messaging + notifications; not re-read line-by-line this pass.

**Error handling:** one global Express error handler returns generic messages to the client and logs full detail server-side — no stack-trace leakage.

## 3. Database — model relationships

```
User (base, discriminator key = role)
 ├─ Jobseeker / Employer / Recruiter / Mentor  (role-specific fields)
 ├─ Follow            (follower → following, one-directional — this is a "follow", NOT a connection)
 ├─ CompanyMember      (user ↔ company/employer, for the "People" tab on a company page)
 ├─ Post               (author, optional company, type: text/image/video/pdf/job/poll/hiring)
 │   ├─ Comment (with replies)
 │   ├─ Like
 │   ├─ Bookmark
 │   ├─ Hashtag
 │   └─ ShareEvent
 ├─ Conversation → Message   (1:1 direct messages only, no group chat)
 ├─ Application        (job applications)
 ├─ Job → JobCategory
 ├─ Notification
 ├─ Plan → Subscription → Payment   (billing)
 ├─ Blog / Faq / CareerTip / Page   (CMS content — Page.js also backs Privacy/Terms/Community-Guidelines)
 ├─ AuditLog / AiUsageLog / SupportTicket / Announcement / Revenue
 └─ Resume
```

**No `Connection` model exists.** Only `Follow` (one-directional, like a subscribe). This matters a lot for your Connection-system request — see §8.

## 4. CMS

| Feature | Status |
|---|---|
| Blogs (create/edit/delete/publish/draft) | `DONE` — real model, real admin UI tab, ownership checks confirmed in `blogController.js` (`blog.author.toString() !== userId`) |
| FAQs | `DONE` — real model + admin CRUD tab, publicly served |
| Career Tips | `DONE` — same pattern as FAQs |
| Legal pages (Privacy/Terms/Community Guidelines) | `DONE` — backed by `Page.js`, admin-editable, publicly fetched by slug |
| Homepage CMS | `PLACEHOLDER` — and this is the best kind of finding: **the codebase already tells you this itself.** `CmsHub.tsx`'s Homepage tab literally renders: *"Homepage editing isn't wired up yet... Your homepage sections (Hero, Stats, Trending Jobs, Categories) are currently hardcoded React components, not database-driven content."* Nothing to discover here — it's an honest, already-documented gap matching your §17 ask exactly. |
| Media library | `MISSING` — uploads go to disk under `backend/uploads/...` per-feature (profile pics, community media, resumes), but there's no unified admin "media library" view to browse/reuse uploads |
| SEO fields (slug/meta/OG) | `MISSING` on CMS content — `Page`/`Blog`/`Faq` models don't carry meta description/OG fields |

## 5. Community / LinkedIn-style features

| Feature | Status |
|---|---|
| Posts: create/edit/delete | `DONE` |
| Like / Comment / Reply | `DONE` (model supports replies via `Comment.js`) |
| Repost/Share | `DONE` — `ShareEvent` model + `sharedFrom` field on `Post`, plus share-to-users and external-share tracking endpoints |
| Bookmark | `DONE` |
| Hashtags / Mentions | `DONE` — dedicated `Hashtag` model, trending endpoint, `mentions` array on `Post` |
| Polls | `DONE` — `pollData` sub-schema + `votePoll` endpoint + `PollWidget.tsx` |
| Hiring posts / Job posts | `DONE` — distinct `hiringData`/`jobData` sub-schemas, `jobData.job` can link to a real `Job` document so "Apply" routes into the real application flow |
| Post visibility (public/followers/connections) | `BROKEN` — this is a real, verified finding, not a guess: `postController.js` **validates and stores** the `visibility` field on create (line 153: `["public","followers","connections"].includes(visibility)`), but I grepped the entire controller and **`visibility` is never referenced anywhere else** — no feed query filters by it. A post marked "connections-only" is currently shown to everyone, identical to public. Your exact ask ("Enforce this in the BACKEND. Do not rely only on frontend hiding.") — right now it's enforced *nowhere*, frontend or backend. |
| Reporting/flagging a post | `MISSING` — `Post.moderation` sub-schema exists (status/flags/reviewedBy, for *admin-side* moderation), but there's no user-facing "report this post" endpoint anywhere in `postRoutes.js` |
| Moderation (admin review queue) | `PARTIAL` — the data model supports it (`moderation.status: pending/flagged/removed`), admin-side review UI not verified this pass |
| Feed types (recent/trending/following/hiring/etc.) | `DONE` — `GET /feed?filter=latest\|trending\|hiring\|interview_experience\|career_tips\|following`, paginated |
| Company pages (About/Jobs/People/Posts/Follow) | `DONE` at the component level — `CompanyAbout.tsx`, `CompanyJobs.tsx`, `EmployeeSection.tsx` (People tab, backed by real `CompanyMember` model), `CompanyFeed.tsx` (Posts), follow button present. Not re-verified end-to-end this pass. |
| Recruiter/Mentor roles | `PARTIAL` — the roles and their data models exist and the whole Community module supports them, but **there is no signup form for them** (public registration only accepts jobseeker/employer) — documented as a known gap in the repo's own `COMMUNITY_MODULE.md`. |

## 6. Connections vs. Follow — the core gap in your request

You're right that Follow isn't enough for a LinkedIn-style network, and I can now say precisely what exists and what doesn't:

- **`Follow` model**: one user → one user, one-directional, no request/accept step. This is what currently powers "Follow/Following" everywhere in the app.
- **`Connection` model**: does not exist. No pending/accepted states, no request/accept/reject/block actions, no `/connections/*` routes.
- **The `Post.visibility` enum already has a `"connections"` value with nothing behind it** (§5) — a strong signal that connections were planned but never built.
- **Messaging is not connection-gated** — any authenticated user can message any other user via `Conversation`/`Message`; there's no check tying DM permission to a connection/follow state.

This is a genuine, scoped, well-understood gap — not something to guess at further. Building it is a real architectural decision (new model + new routes + new UI states + notification wiring + visibility enforcement + optional messaging-gating) and per your own instructions I'm not starting it without your go-ahead. My recommendation is in §9.

## 7. Admin

Sidebar nav groups (Overview/People/Hiring/Monetization/Intelligence/Content/Platform) mostly resolve to real pages. Two dead links found this session:
- **"Advertisement Management"** and **"Notifications"** nav entries in `Sidebar.tsx` have no `path` — same placeholder pattern the Subscription Management link used to have before I fixed it earlier this session.
- **`/admin/security`** nav link points to a route that doesn't exist in `App.tsx` (superadmin-only, `Lock` icon) — dead link.

## 8. Mobile / Capacitor readiness

This needs your attention before anything else mobile-related:

- **`frontend/android/` exists** — a real, generated Capacitor Android project (Gradle files, `capacitor.config.json` with `appId: com.quickjobs.app`, `webDir: dist`).
- **But `frontend/package.json` has zero `@capacitor/*` packages** — no `@capacitor/core`, `@capacitor/android`, or `@capacitor/cli`. This means the Android project on disk is **orphaned**: `npx cap sync`/`npx cap open android` would fail right now because the JS tooling that drives Capacitor isn't installed. Someone ran `npx cap add android` at some point and the native project was generated, but the npm dependencies never made it into (or were removed from) `package.json`.
- **No iOS project** at all.
- Responsive design: not systematically tested this session at your requested breakpoints (320/375/390/430/768/1024/1280/1440px) — I fixed one new component (the chatbot) to be responsive, but I have not swept the whole app.
- Touch-friendliness, safe-area handling, keyboard handling, camera/file-picker readiness: not audited.

**Bottom line: Capacitor is `BROKEN` (inconsistent state), not `PARTIAL`.** The good news is fixing it is cheap — reinstall the matching `@capacitor/core`/`@capacitor/android`/`@capacitor/cli` versions and run a sync — but I haven't done that without your say-so since it touches `package.json` and could interact with the existing (possibly stale) native project in ways worth deciding together.

## 9. What I recommend, in order

I'm not starting any of these without your confirmation — this is the plan, not the implementation:

1. **Decide on the Connection system first** (§6) — it's the architectural foundation several other asks depend on (visibility enforcement, connection-gated messaging, "people you may know"). I'd build it as a new `Connection` model (states: `pending`/`accepted`/`blocked`, directional `requester`/`recipient` fields) sitting *alongside* `Follow`, not replacing it — matches how LinkedIn itself keeps "connect" and "follow" as separate actions. I'll write this up in more detail and confirm the design with you before touching code.
2. **Enforce `Post.visibility` server-side** — small, contained fix once a "are these two users connected" check exists to power the `"connections"` case; `"followers"` can be enforced today against the existing `Follow` model without waiting on step 1.
3. **Fix Capacitor's dependency mismatch** — quick, low-risk, unblocks everything else mobile-related.
4. **Homepage CMS** — turn the already-honest placeholder into a real `Page`-backed (or new lightweight model) editable Hero/Stats/etc., matching the pattern already used for legal pages.
5. Everything else in your list (reporting/flagging, media library, SEO fields, mutual-connections/suggestions, admin dead-link cleanup) — smaller, independent items I can slot in around the above.

## 10. What I have NOT audited this pass (being honest, not silent)

- Full route-by-route IDOR sweep beyond the auth/profile/payment endpoints checked earlier this session.
- Socket.IO real-time message delivery, typing indicators, online/offline status — presence confirmed, behavior not exercised.
- The WebRTC calling code (`CallOverlay.tsx`/`useWebRTC.ts`) — noted it exists, didn't verify it works.
- Job↔Community integration UI (sharing a job post into the feed from the employer side) — model support confirmed, UI flow not walked through.
- Systematic responsive-breakpoint testing.
- Android build (`gradlew assembleDebug`) — not run, and would fail today per §8 anyway.

---

**I'm stopping here per your instructions.** Tell me which of §9's items to start with (or reorder it), and I'll explain the plan for that one piece in plain language, implement it, test it, and report back — one feature at a time, not a bulk rewrite.
