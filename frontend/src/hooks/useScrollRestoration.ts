import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Scroll offsets are kept per scrollable container (the window, plus any
// number of independently-scrolling nested shells like AdminShell's own
// <main>), each keyed by React Router's location.key — the same key is
// replayed on browser back/forward, which is what lets a POP navigation
// restore exactly where that entry was left. A module-less in-memory Map
// is enough: it only needs to survive for the life of the tab, matching
// native browser scroll-restoration semantics (a hard refresh legitimately
// starts fresh).
const positionsByContainer = new Map<string, Map<string, number>>();

function getPositions(containerKey: string) {
  let positions = positionsByContainer.get(containerKey);
  if (!positions) {
    positions = new Map();
    positionsByContainer.set(containerKey, positions);
  }
  return positions;
}

function readScrollTop(el: HTMLElement | null): number {
  return el ? el.scrollTop : window.scrollY;
}

function writeScrollTop(el: HTMLElement | null, top: number) {
  if (el) el.scrollTop = top;
  else window.scrollTo(0, top);
}

/**
 * Centralized scroll-restoration for React Router v6 apps using
 * <BrowserRouter>/<Routes> (no access to the data router's built-in
 * <ScrollRestoration>).
 *
 * Behavior, matched to what a real module-based nav should do:
 *  - Browser back/forward (POP): restore the scroll offset that container
 *    had when this exact history entry was last left.
 *  - Navigating to a different pathname (PUSH/REPLACE, e.g. clicking a
 *    navbar link): scroll to top — a new "module" should start below the
 *    header, not wherever the previous page happened to be scrolled to.
 *  - Navigating within the same pathname (e.g. a query-param-driven tab
 *    or filter): do nothing — this is the "don't unnecessarily reset"
 *    case, since it isn't really a page change.
 *
 * Pass `containerRef` for a nested scrollable region (an `overflow-y-auto`
 * shell like AdminShell's <main>) whose scrollTop — not window.scrollY —
 * is what actually needs resetting/restoring; omit it to manage the
 * window itself. `containerKey` just needs to be stable and unique per
 * distinct container so their histories don't collide.
 */
export function useScrollRestoration(containerRef?: RefObject<HTMLElement>, containerKey = 'window') {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(location.pathname);

  useLayoutEffect(() => {
    const el = containerRef?.current ?? null;
    const positions = getPositions(containerKey);

    if (navigationType === 'POP') {
      writeScrollTop(el, positions.get(location.key) ?? 0);
    } else if (prevPathnameRef.current !== location.pathname) {
      writeScrollTop(el, 0);
    }
    // else: same pathname, only search/hash changed — leave scroll alone.

    prevPathnameRef.current = location.pathname;

    return () => {
      positions.set(location.key, readScrollTop(el));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.key, navigationType, containerKey]);
}
