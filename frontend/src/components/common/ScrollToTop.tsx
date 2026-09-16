import { useEffect } from 'react';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';

/**
 * Mounted once, inside the router. Manages window scroll position for
 * every route that scrolls the page itself (i.e. everything except a
 * nested shell with its own overflow-y-auto region — see AdminShell,
 * which calls useScrollRestoration directly against its own <main>).
 */
export function ScrollToTop() {
  useEffect(() => {
    // Take manual control so the browser's own scroll restoration (which
    // fires on refresh/back-forward using its own heuristics) doesn't
    // fight with the logic below.
    const original = window.history.scrollRestoration;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = original;
      }
    };
  }, []);

  useScrollRestoration();

  return null;
}

export default ScrollToTop;
