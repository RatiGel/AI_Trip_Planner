"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = { lat: number; lng: number; accuracy: number };

// NOTE: navigator.geolocation only resolves on secure origins (https or
// localhost). On plain http it silently never fires — nothing to handle here.

/** Maps a GeolocationPositionError code to an i18n key in the `map` namespace. */
function errorKey(code: number): string {
  if (code === 1) return "geoDenied";        // PERMISSION_DENIED
  if (code === 3) return "geoTimeout";        // TIMEOUT
  return "geoUnavailable";                     // POSITION_UNAVAILABLE (2) + fallback
}

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    setError(null);
  }, []);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("geoUnavailable");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPosition(pos);
        setLoading(false);
      },
      (err) => {
        setError(errorKey(err.code));
        setLoading(false);
      },
      OPTIONS,
    );
  }, [onPosition]);

  const watch = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("geoUnavailable");
      return;
    }
    clearWatch();
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => {
        setError(errorKey(err.code));
        clearWatch();
        setTracking(false);
      },
      OPTIONS,
    );
  }, [clearWatch, onPosition]);

  const stop = useCallback(() => {
    clearWatch();
    setTracking(false);
    // coords intentionally left as-is so the marker freezes at last position.
  }, [clearWatch]);

  // Clean up any active watch on unmount.
  useEffect(() => clearWatch, [clearWatch]);

  return { coords, loading, error, tracking, locate, watch, stop };
}
