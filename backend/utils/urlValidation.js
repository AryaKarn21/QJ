// Shared by anything that accepts a plain image/link URL typed directly
// into a form (category icons, blog featured images, advertisement links)
// instead of an uploaded file — http(s) only, so `javascript:`/`data:`/etc
// can never end up rendered as an <img src>/<a href> elsewhere in the app.
function isSafeHttpUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = { isSafeHttpUrl };
