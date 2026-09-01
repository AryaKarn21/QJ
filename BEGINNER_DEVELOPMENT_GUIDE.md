# QuickJobs — Beginner's Development Guide

This explains how the project fits together, in plain language, and gives you exact commands to run. Written for someone who hasn't worked on this codebase before — not generic advice, everything here matches how *this* project is actually built.

---

## 1. What this project actually is

Two separate programs that talk to each other over the network:

- **`backend/`** — a Node.js/Express server. It talks to a MongoDB database, checks passwords, decides who's allowed to see what, and answers requests like "give me the latest jobs" as JSON data. It has no visual design at all — it's pure logic and data.
- **`frontend/`** — a React (TypeScript) website built with Vite. Everything you actually *see* — buttons, pages, forms — lives here. It never talks to the database directly; it always asks the backend for data over HTTP.

They run as two separate processes, usually in two separate terminal windows, while you're developing.

## 2. How to install

You need [Node.js](https://nodejs.org) installed first (any recent version works).

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

That's it — each folder has its own `package.json` listing what it needs, and `npm install` downloads all of it into a `node_modules` folder (which is why the project's `.gitignore` excludes `node_modules` — it's rebuilt from `package.json`, never stored/shared directly).

## 3. How to start the backend

```bash
cd backend
npm run dev
```

This starts the server on `http://localhost:3000` (or whatever `PORT` you set — see below) and auto-restarts whenever you save a file, thanks to `nodemon` (see `"dev": "nodemon server.js"` in `backend/package.json`).

**Before this will work**, you need a `backend/.env` file — see §4.

## 4. How environment variables work

The backend reads configuration from a file called `backend/.env` — a plain text file of `KEY=value` lines that is **never committed to git** (real passwords/secrets don't belong in shared code). `backend/.env.example` is the *template*: same keys, placeholder values, safe to share.

To set yours up:

```bash
cd backend
cp .env.example .env
```

Then open `.env` and fill in real values. The ones you genuinely need to get a local copy running:

| Key | What it's for |
|---|---|
| `MONGO_URI` | Where your MongoDB database lives. For local dev you can install MongoDB yourself, or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster — either way, this is the connection string. |
| `JWT_SECRET` | A random string the server uses to sign login tokens. Generate one with `openssl rand -hex 64`, or just mash the keyboard for 64 characters — it just needs to be long and secret. |
| `SESSION_SECRET` | Same idea, for a different piece of the login system (Google sign-in). |
| `FRONTEND_URL` / `BACKEND_URL` | `http://localhost:5173` and `http://localhost:3000` for local dev — these are already correct in `.env.example`. |

Everything else (Google OAuth keys, email, Gemini AI key) is **optional** — the app is built to degrade gracefully without them (Google sign-in just won't work, AI features return a clear "not configured" message instead of crashing).

The frontend has its own, much smaller `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_MEDIA_URL=http://localhost:3000
```
This just tells the frontend where the backend lives.

**If the server won't start at all**, check the terminal output — `server.js` checks for `JWT_SECRET`/`SESSION_SECRET`/`MONGO_URI` right at startup and refuses to run with a clear error message if any are missing, rather than starting broken.

## 5. How to start the frontend

In a **second** terminal (leave the backend running in the first one):

```bash
cd frontend
npm run dev
```

This starts Vite's dev server, usually at `http://localhost:5173` — open that in your browser.

## 6. How the database works

MongoDB doesn't use tables like a spreadsheet database — it stores JSON-like documents in "collections." Each collection is defined by a **model** file in `backend/models/` (e.g., `User.js`, `Post.js`, `Connection.js`) — that file describes what fields a document has and what type each one is.

The key relationships, in plain terms:

- **User** is the base account. Jobseeker/Employer/Recruiter/Mentor are *specialized* versions of a User (same collection, extra fields) — a technique called a "discriminator."
- **Follow** — one person follows another. One-directional, instant, no approval needed. Like subscribing.
- **Connection** — two people mutually agree to connect (request → accept). Different from Follow on purpose — see §8.
- **Post** → has many **Comment**, **Like**, **Bookmark** documents pointing back at it.
- **Conversation** → has many **Message** documents.
- **Job** → has many **Application** documents (people applying).

## 7. How authentication works

1. You register with an email + password. The password is never stored as-is — it's run through `bcrypt` (a one-way scrambling function) and only the scrambled version is saved.
2. Logging in checks your password against that scrambled version, and if it matches, the server hands back a **JWT** — a signed token, like a hall pass, that proves who you are without needing to send your password again on every request.
3. The frontend stores that token in the browser's `localStorage` and attaches it to every request as an `Authorization: Bearer <token>` header.
4. The backend has a piece of middleware (`middleware/authMiddleware.js`) that checks this token on any route that requires login, and figures out your user id + role from it.

Google sign-in is a separate path (`controllers/authController.js`) that ends the same way — it also hands back one of these JWTs once Google confirms who you are.

## 8. How Community (posts, follows, connections) works

- **Posts** live in one collection with a `type` field (`text`/`image`/`video`/`pdf`/`job`/`poll`/`hiring`) rather than several different collections — simpler to mix all types together in one feed.
- **Visibility**: every post has a `visibility` field — `public`, `followers`, `connections`, or `private`. This is checked on the *server*, every time a post is read (feed, single post, comments, even reposts) — never trust the browser alone to hide something, since anyone can call the API directly with tools like Postman. See `backend/utils/postVisibility.js` — that's the one place this rule lives.
- **Follow vs. Connection** — this trips people up, so: Follow is one person choosing to see another's posts, no approval needed (like a subscribe button). Connection requires both people to agree (request → accept), same as a real professional network. A `visibility: "connections"` post is checked against the **Connection** collection, never Follow — someone who only follows you cannot see your connections-only posts.

## 9. How connections work, end to end

```
You visit someone's profile
        |
        v
Click "Connect"  ->  POST /api/community/connections/request/:userId
        |
        v
They get a notification: "X wants to connect with you"
        |
        v
They open /community/connections/requests, click Accept
        |
        v
POST .../accept  ->  Connection status becomes "accepted"
        |
        v
Both of you now see each other under /community/connections
```

The whole thing lives in three files: `backend/models/Connection.js` (the data shape), `backend/controllers/connectionController.js` (the rules — who can accept what, blocking, etc.), and `backend/routes/connectionRoutes.js` (which URL maps to which rule).

## 10. How the CMS works

"CMS" here means: content an admin can edit without a developer touching code. Blogs, FAQs, Career Tips, legal pages (Privacy Policy, Terms), and now the homepage's Hero + closing "Join Now" banner are all real, working CMS content — an admin logs into `/admin`, edits something in the CMS section, and it's immediately live on the public site once they check "Published." The homepage's "Why Choose Us" feature cards (`Stats.tsx`, despite the filename) are **not** CMS-controlled — each card's icon and internal link are tightly coupled to its text, so editing the words without also being able to change the icon would be a confusing half-measure. If nothing is published in the Homepage CMS tab, the site just shows its original built-in copy — publishing never breaks the page, it only replaces the words.

## 11. How to test the backend APIs

The backend has real automated tests using Jest:

```bash
cd backend
npm test
```

This runs every file in `backend/tests/` — each one mocks the database (no real MongoDB needed to run these) and checks that specific rules hold, e.g. "a follower who isn't a connection cannot see a connections-only post." If you change backend logic, run this — a red (failing) test means you broke something that used to work.

To manually try an API endpoint without a browser, use a tool like [Postman](https://www.postman.com/) or `curl`. Example — checking the health of the server:
```bash
curl http://localhost:3000/health
```

## 12. How to test the frontend

```bash
cd frontend
npx tsc --noEmit    # TypeScript check — catches type mistakes without building
npx eslint .         # Lint — catches common bugs/style issues
npm run build        # Full production build — the strictest check; if this fails, something is genuinely broken
```

There's no automated frontend test suite yet (`npm test` in `frontend/` currently does nothing — see its `package.json`). For now, "testing the frontend" means running it (`npm run dev`) and clicking through the actual feature you changed.

## 13. How Capacitor works (and its current problem)

Capacitor is what lets a React web app also run as a real Android/iOS app, using the same code. **Right now, this doesn't actually work in this project** — there's a generated Android project on disk (`frontend/android/`), but the npm packages that drive it (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) aren't installed in `frontend/package.json`. This needs to be fixed (reinstalling matching versions of those packages) before any Android build will succeed. Don't try `npx cap sync` or `npx cap open android` yet — it'll fail with missing-package errors until that's fixed.

## 14. How to build for production

```bash
cd frontend
npm run build
```

This produces a `frontend/dist/` folder — plain HTML/CSS/JS files, ready to be served by any static web host. The backend doesn't have a separate "build" step (it's plain Node.js) — in production you'd just run `node server.js` (or `npm start`) with real environment variables set, typically behind a process manager and a reverse proxy, but that's a deployment topic, not a development one.

---

## Where things live — quick reference

```
backend/
  models/         one file per database collection
  controllers/    the actual logic for each feature
  routes/         maps URLs (e.g. POST /api/community/connections/request/:userId) to a controller function
  middleware/     code that runs BEFORE a route — auth checks, rate limits, file upload handling
  utils/          shared helper code used by multiple controllers
  tests/          automated tests (npm test)

frontend/src/
  api/            one file per backend feature — the ONLY place that calls axios/fetch
  components/     the actual UI, organized by area (community/, admin/, jobseeker/, employer/...)
  App.tsx         the master list of every URL the site responds to
  types/          shared TypeScript shapes so components agree on what data looks like
```
