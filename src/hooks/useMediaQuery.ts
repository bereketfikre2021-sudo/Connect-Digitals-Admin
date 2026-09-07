import { useState, useEffect } from "react";

/**
 * Returns true when the given media query matches.
 * Listens for changes (e.g. window resize) and re-renders accordingly.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers
    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }

    // Fallback (Safari < 14)
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}
