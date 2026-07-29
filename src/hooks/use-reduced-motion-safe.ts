"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Hydration-safe reduced-motion flag.
 *
 * framer-motion's useReducedMotion() returns null on the server but the real
 * media-query result on the client's first render, so any component branching on
 * it emits different `initial` styles in the SSR HTML than during hydration —
 * which React reports as a hydration mismatch.
 *
 * useSyncExternalStore takes a separate server snapshot, so the value is defined
 * on both sides and the two renders agree. Reporting "reduce" for SSR is the
 * safe default: the server cannot know the device preference, and shipping HTML
 * already in its final resting state means the page is readable even if
 * hydration never completes. Motion-allowing clients read the real value on
 * their first render, before framer-motion reads `initial`, so entrance
 * animations still play.
 *
 * Unlike framer-motion's version this also tracks changes to the OS setting.
 */
export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
