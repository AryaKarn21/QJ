/**
 * Converts a raw axios/fetch error into a short, user-facing message,
 * instead of surfacing "AxiosError", "403 Forbidden", or a stack trace
 * directly in the UI. New features should route caught errors through
 * `getFriendlyErrorMessage` before showing them to the user (toast, inline
 * banner, etc.) — the technical detail is still logged to the console for
 * developers, gated to non-production so it never leaks into a prod build's
 * console either.
 *
 * Not a blanket refactor of every existing API call site (there are ~40 of
 * them across the app, each with its own ad hoc `err.response?.data?.message`
 * fallback) — this is the shared implementation new/touched code adopts
 * going forward.
 */

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: { message?: string; error?: string };
  };
  request?: unknown;
  code?: string;
  message?: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "That request wasn't valid. Please check the form and try again.",
  401: "Please sign in again to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  409: "This conflicts with something that already exists.",
  422: "Some of the information provided isn't valid.",
  429: "You're doing that too much — please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "Something went wrong on our end. Please try again in a moment.",
  503: "This feature is temporarily unavailable. Please try again shortly.",
};

/**
 * Returns a friendly message for the given error, preferring a
 * server-provided `message`/`error` field (these are already written to be
 * user-facing throughout this codebase's controllers) over the generic
 * per-status fallback, and falling back further to network/timeout copy
 * when there was no response at all.
 */
export function getFriendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = error as ApiErrorLike;

  if (import.meta.env.DEV) {
    // Full technical detail for developers — never shown to the user, and
    // stripped out of production builds since import.meta.env.DEV is
    // statically replaced with `false` and dead-code-eliminated by Vite.
    // eslint-disable-next-line no-console
    console.error("[API error]", err);
  }

  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.message || err?.response?.data?.error;

  if (serverMessage && typeof serverMessage === "string") {
    return serverMessage;
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "")) {
    return "That took too long to respond. Please check your connection and try again.";
  }

  if (err?.request && !err?.response) {
    return "Couldn't reach the server. Please check your connection and try again.";
  }

  return fallback;
}

/** True for 401 (needs to authenticate) responses. */
export function isUnauthorized(error: unknown): boolean {
  return (error as ApiErrorLike)?.response?.status === 401;
}

/** True for 403 (authenticated, but insufficient permission) responses. */
export function isForbidden(error: unknown): boolean {
  return (error as ApiErrorLike)?.response?.status === 403;
}
