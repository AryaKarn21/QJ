// Shared rich-text sanitizer for HTML stored from a ReactQuill editor
// (currently: the CMS "Pages" module's content field — Blog.content is
// plain text, not HTML, and is deliberately NOT run through this; see the
// comment in blogController.js). Applied at write time (create/update),
// not read time, so already-published content isn't stripped
// retroactively by an unrelated request.
//
// Dependency-free by design: `sanitize-html` (the obvious off-the-shelf
// choice) pulls in `htmlparser2`, which ships ESM-only — this backend is
// CommonJS throughout and has no Babel/ESM transform pipeline, so that
// dependency broke Jest ("Cannot use import statement outside a module")
// the moment anything required this file. Rather than add a build-tool
// dependency just to sanitize a handful of admin-authored pages, this
// takes the same "strip anything script-capable" approach a regex/allow-
// list pass can do reliably, without a full HTML parser:
//   - Drops <script>/<style>/<iframe>/<object>/<embed>/<link>/<meta>/
//     <base> tags, including their content.
//   - Strips every inline event-handler attribute (onclick, onerror, …).
//   - Neutralizes javascript:/vbscript:/data:text\/html URIs in
//     href/src/action attributes.
// This is intentionally narrower than a full allow-list sanitizer (it
// doesn't re-validate every remaining tag/attribute) — acceptable here
// because the only writers are authenticated admins (CMS Pages is
// admin-only, see cmsRoutes.js's authorizeAdmin gate), so this is
// defense-in-depth against a compromised/malicious admin session or a
// direct API call, not the sole XSS boundary for untrusted public input.
const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "base"];

function stripDangerousTags(html) {
  let out = html;
  for (const tag of DANGEROUS_TAGS) {
    // Paired tags with content (script/style/iframe/object/embed).
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    // Self-closing/void forms (link/meta/base, or a self-closed variant of the above).
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }
  return out;
}

function stripEventHandlerAttributes(html) {
  // Matches on<word>="..." / on<word>='...' / on<word>=unquoted-token
  return html.replace(/\son[a-z]+\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, "");
}

function neutralizeDangerousUrls(html) {
  return html.replace(
    /\s(href|src|action)\s*=\s*("(?:javascript|vbscript|data:text\/html)[^"]*"|'(?:javascript|vbscript|data:text\/html)[^']*')/gi,
    ' $1="#"'
  );
}

function sanitizeRichText(html) {
  if (typeof html !== "string" || !html) return "";
  let out = stripDangerousTags(html);
  out = stripEventHandlerAttributes(out);
  out = neutralizeDangerousUrls(out);
  return out;
}

module.exports = { sanitizeRichText };
