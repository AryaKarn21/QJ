/**
 * config/supabaseClient.js
 *
 * Centralized Supabase server client — created once and reused everywhere
 * a file needs to be stored/read/deleted, instead of every controller or
 * service calling `createClient(...)` on its own with its own copy of the
 * credentials.
 *
 * This uses the SERVICE ROLE key, which bypasses Row Level Security
 * entirely — every read/write made through this client is trusted because
 * the request already passed this app's own authentication/authorization
 * middleware (see routes/authMiddleware.js), not because Supabase itself
 * is re-checking who's asking. That means this key must never leave the
 * backend:
 *   - never sent to the frontend in any API response
 *   - never referenced from a VITE_-prefixed env var (Vite inlines those
 *     into the browser bundle at build time — a VITE_SUPABASE_SERVICE_ROLE_KEY
 *     would ship the key to every visitor)
 *   - never hardcoded — always read from process.env, and .env is already
 *     git-ignored (see backend/.gitignore)
 *
 * Guarded the same way GEMINI_API_KEY is in utils/geminiClient.js: if
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't set, getSupabaseClient()
 * throws a clearly-labeled error instead of Supabase's own (much more
 * cryptic) failure — services/media.service.js catches this and falls
 * back to local disk, so a deploy that hasn't configured Supabase yet
 * still works.
 */
const { createClient } = require("@supabase/supabase-js");

// The single bucket every upload (profile photos, cover photos, company
// logos, resumes) is stored in, organized by folder within it — see
// services/media.service.js's FOLDER_MAP. Must be created once, manually,
// in the Supabase dashboard (Storage → New bucket → "qj-media", Public).
const SUPABASE_BUCKET = "qj-media";

let cachedClient = null;

function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing)."
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      // Server-side, one-request-at-a-time usage — no browser session to
      // persist or refresh.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

module.exports = { getSupabaseClient, SUPABASE_BUCKET };
