"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe media-query flag.
 *
 * Mirrors useReducedMotionSafe: useSyncExternalStore keeps a separate server
 * snapshot so SSR and the client's first render agree instead of tripping a
 * hydration mismatch. The server cannot know the viewport, so it reports false
 * — callers should treat that as "assume small screen" and let the client
 * correct on its first render.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True on Tailwind's `lg` breakpoint and up (>=1024px). */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
