import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Keeps "am I following user X" in sync across every mounted component at
// once — the profile header's Follow button, that same person's row in a
// Followers/Following list, their card in the "who to follow" sidebar,
// and search results can all be on screen simultaneously, and without a
// shared store each one would carry its own local `useState`, so
// following someone from the sidebar wouldn't be reflected in a followers
// list showing that same person until a manual refetch.
//
// This is a thin, single-purpose cache — not a general data-fetching
// layer. Each consumer still fetches its own "is this person followed"
// truth from the server as normal (profile page, followers list, etc.);
// `useFollowState` just seeds this shared map from that fetch and reads
// from it, so a toggle anywhere updates every other subscriber for the
// same userId immediately, and a fresh server fetch (e.g. navigating back
// to a profile) always re-seeds the map rather than trusting a
// possibly-stale local guess forever.
interface FollowContextValue {
  overrides: Map<string, boolean>;
  setFollowing: (userId: string, isFollowing: boolean) => void;
}

const FollowContext = createContext<FollowContextValue>({
  overrides: new Map(),
  setFollowing: () => {},
});

export function FollowProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const setFollowing = useCallback((userId: string, isFollowing: boolean) => {
    setOverrides((prev) => {
      if (prev.get(userId) === isFollowing) return prev; // no-op, skip the re-render
      const next = new Map(prev);
      next.set(userId, isFollowing);
      return next;
    });
  }, []);

  return <FollowContext.Provider value={{ overrides, setFollowing }}>{children}</FollowContext.Provider>;
}

// `initialFollowing` should be whatever the calling component just fetched
// from the server for this userId (a profile header's counts response, a
// followers-list row, a suggestion card, ...). Every render where it
// changes re-seeds the shared cache, so the most recent server fetch
// always wins over a stale optimistic guess from elsewhere in the app.
export function useFollowState(userId: string, initialFollowing: boolean): [boolean, (next: boolean) => void] {
  const { overrides, setFollowing } = useContext(FollowContext);

  useEffect(() => {
    setFollowing(userId, initialFollowing);
    // Only re-seed when the target or the freshly-fetched value changes —
    // not on every render, and not when some OTHER component updates the
    // shared map (that's the point: this stays whatever this instance's
    // own last known-good value was until the target/prop actually change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialFollowing]);

  const isFollowing = overrides.has(userId) ? (overrides.get(userId) as boolean) : initialFollowing;
  const update = useCallback((next: boolean) => setFollowing(userId, next), [userId, setFollowing]);
  return [isFollowing, update];
}
