"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownUp, MapPin, Search, Route, Loader2, Crosshair, LocateFixed, Footprints, Bus, TrainFront, Pencil, PanelLeftOpen } from "lucide-react";
import type { GeocodeResult, JourneyPlan } from "@/types/transit";
import { useGeolocation } from "@/hooks/use-geolocation";
import { JourneyCard } from "./journey-card";
import { JourneyMap } from "./journey-map";

type Field = "from" | "to";

function useGeocode(locale: string) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useCallback((q: string, cb: (r: GeocodeResult[]) => void) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      cb([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transit/geocode?q=${encodeURIComponent(q)}&locale=${locale}`);
        cb(res.ok ? await res.json() : []);
      } catch {
        cb([]);
      }
    }, 400);
  }, [locale]);
  return search;
}

export function RoutePlanner() {
  const t = useTranslations("transit");
  const tMap = useTranslations("map");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const listId = useId();

  const { coords: userCoords, tracking, error: geoError, watch, stop } = useGeolocation();
  const [recenterTick, setRecenterTick] = useState(0);

  useEffect(() => {
    if (geoError) toast.error(tMap(geoError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoError]);

  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromSel, setFromSel] = useState<GeocodeResult | null>(null);
  const [toSel, setToSel] = useState<GeocodeResult | null>(null);
  const [suggestions, setSuggestions] = useState<Record<Field, GeocodeResult[]>>({ from: [], to: [] });
  const [active, setActive] = useState<Field | null>(null);

  const [plans, setPlans] = useState<JourneyPlan[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // After planning, the left panel collapses to give the map full width.
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fromLocating, setFromLocating] = useState(false);
  // From field mode. "address" = user chose to type; otherwise focusing the
  // empty From field shows the chooser (My location / Enter address).
  const [fromMode, setFromMode] = useState<"address" | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);

  const geocode = useGeocode(locale);

  const selectedPlan = plans?.find((p) => p.id === selectedId) ?? null;

  function onInput(field: Field, value: string) {
    if (field === "from") {
      setFromText(value); setFromSel(null);
      // Emptying the address input returns the field to the chooser.
      if (value === "") setFromMode(null);
    } else { setToText(value); setToSel(null); }
    geocode(value, (r) => setSuggestions((s) => ({ ...s, [field]: r })));
  }

  function pick(field: Field, r: GeocodeResult) {
    if (field === "from") { setFromText(r.label); setFromSel(r); }
    else { setToText(r.label); setToSel(r); }
    setSuggestions((s) => ({ ...s, [field]: [] }));
    setActive(null);
  }

  function swap() {
    setFromText(toText); setToText(fromText);
    setFromSel(toSel); setToSel(fromSel);
  }

  // One-shot: fill the From field from the device location, reverse-geocoded.
  // Independent of the live-tracking hook — this needs a single fix, once.
  function fillFromWithMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error(tMap("geoUnavailable"));
      return;
    }
    setFromLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let result: GeocodeResult | null = null;
        try {
          const res = await fetch(`/api/transit/geocode?lat=${lat}&lng=${lng}&locale=${locale}`);
          if (res.ok) result = (await res.json()) as GeocodeResult | null;
        } catch {
          result = null;
        }
        const filled: GeocodeResult = result ?? { label: t("myLocation"), lat, lng };
        setFromText(filled.label);
        setFromSel(filled);
        setSuggestions((s) => ({ ...s, from: [] }));
        setFromLocating(false);
        setActive(null);
      },
      (err) => {
        const key = err.code === 1 ? "geoDenied" : err.code === 3 ? "geoTimeout" : "geoUnavailable";
        toast.error(tMap(key));
        setFromLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function plan() {
    if (!fromSel || !toSel) return;
    setLoading(true); setError(false); setPlans(null);
    try {
      const res = await fetch("/api/transit/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: [fromSel.lat, fromSel.lng],
          to: [toSel.lat, toSel.lng],
          locale,
        }),
      });
      if (!res.ok) { setError(true); return; }
      const data = (await res.json()) as { plans: JourneyPlan[] };
      // Sort by least walking first, then shortest total duration. Least walk
      // to the stop is the primary rank; duration breaks ties.
      const sorted = [...data.plans].sort((a, b) => {
        const wa = a.walkMin ?? Infinity;
        const wb = b.walkMin ?? Infinity;
        if (wa !== wb) return wa - wb;
        return (a.durationMin ?? Infinity) - (b.durationMin ?? Infinity);
      });
      setPlans(sorted);
      setSelectedId(sorted[0]?.id ?? null); // auto-select least-walk route
      setPanelCollapsed(false); // show the options list; Go collapses the panel
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const canPlan = !!fromSel && !!toSel && !loading;

  // Choose "type an address" mode: reveal a normal text input and focus it.
  function chooseAddressMode() {
    setFromMode("address");
    setSuggestions((s) => ({ ...s, from: [] }));
    // Focus after the input renders.
    requestAnimationFrame(() => fromInputRef.current?.focus());
  }

  function renderField(field: Field) {
    const text = field === "from" ? fromText : toText;
    const dotColor = field === "from" ? "var(--site-text-40)" : "#B5271D";
    const sugg = suggestions[field];
    const focused = active === field;

    // From field, no mode chosen yet, nothing typed → show the chooser menu.
    const showChooser = field === "from" && fromMode === null && !fromSel && fromText === "";

    return (
      <div className="relative">
        <div
          className="flex items-center gap-3 rounded-xl px-3 transition-all"
          style={{
            background: "var(--site-bg-elevated)",
            border: `1px solid ${focused ? "#0891B2" : "var(--site-border-06)"}`,
            boxShadow: focused ? "0 0 0 3px rgba(8,145,178,0.15)" : "none",
          }}
        >
          {field === "from" ? (
            <span className="grid size-4 shrink-0 place-items-center">
              <span className="size-2.5 rounded-full ring-2" style={{ background: "transparent", color: dotColor, boxShadow: `inset 0 0 0 2px ${dotColor}` }} />
            </span>
          ) : (
            <MapPin className="size-4 shrink-0" style={{ color: dotColor, fill: "rgba(181,39,29,0.15)" }} />
          )}

          {showChooser ? (
            // Read-only trigger — clicking opens the chooser menu below.
            <button
              type="button"
              className="flex w-full items-center py-3 text-left text-[15px] outline-none"
              style={{ color: "var(--site-text-40)" }}
              aria-haspopup="listbox"
              aria-expanded={focused}
              onFocus={() => setActive("from")}
              onClick={() => setActive("from")}
            >
              {t("fromPlaceholder")}
            </button>
          ) : (
            <input
              ref={field === "from" ? fromInputRef : undefined}
              className="w-full bg-transparent py-3 text-[15px] outline-none"
              style={{ color: "var(--site-text)" }}
              placeholder={field === "from" ? t("fromPlaceholder") : t("toPlaceholder")}
              value={text}
              role="combobox"
              aria-expanded={focused && sugg.length > 0}
              aria-controls={`${listId}-${field}`}
              autoComplete="off"
              onFocus={() => setActive(field)}
              onChange={(e) => onInput(field, e.target.value)}
            />
          )}
        </div>

        {/* Chooser menu — My location / Enter address */}
        {showChooser && focused && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl shadow-lg"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-10)" }}
          >
            <li role="option" aria-selected={false}>
              <button
                type="button"
                disabled={fromLocating}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] transition-colors hover:bg-[var(--site-surface-08)] disabled:opacity-60"
                style={{ color: "var(--site-text)" }}
                onMouseDown={(e) => { e.preventDefault(); fillFromWithMyLocation(); }}
              >
                {fromLocating ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" style={{ color: "#0891B2" }} />
                ) : (
                  <LocateFixed className="size-4 shrink-0" style={{ color: "#0891B2" }} />
                )}
                <span className="font-medium">{fromLocating ? t("locating") : t("useMyLocation")}</span>
              </button>
            </li>
            <li role="option" aria-selected={false} style={{ borderTop: "1px solid var(--site-border-06)" }}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] transition-colors hover:bg-[var(--site-surface-08)]"
                style={{ color: "var(--site-text)" }}
                onMouseDown={(e) => { e.preventDefault(); chooseAddressMode(); }}
              >
                <Pencil className="size-4 shrink-0" style={{ color: "var(--site-text-50)" }} />
                <span className="font-medium">{t("enterAddress")}</span>
              </button>
            </li>
          </ul>
        )}

        {/* Address suggestions */}
        {!showChooser && focused && sugg.length > 0 && (
          <ul
            id={`${listId}-${field}`}
            role="listbox"
            className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl shadow-lg"
            style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-10)" }}
          >
            {sugg.map((r, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--site-surface-08)]"
                  style={{ color: "var(--site-text)" }}
                  onMouseDown={(e) => { e.preventDefault(); pick(field, r); }}
                >
                  <MapPin className="size-3.5 shrink-0" style={{ color: "var(--site-text-40)" }} />
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-8 transition-[grid-template-columns] duration-300 ease-out ${
        panelCollapsed ? "lg:grid-cols-[52px_1fr]" : "lg:grid-cols-[minmax(0,420px)_1fr]"
      }`}
    >
      {/* ── Collapsed: thin strip to reopen the search panel ── */}
      {panelCollapsed && (
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3 lg:pt-1">
          <button
            type="button"
            onClick={() => setPanelCollapsed(false)}
            aria-label={t("editRoute")}
            title={t("editRoute")}
            className="grid size-11 place-items-center rounded-xl transition-colors hover:brightness-110"
            style={{ background: "#0891B2", color: "#fff", boxShadow: "0 4px 16px rgba(8,145,178,0.3)" }}
          >
            <PanelLeftOpen className="size-5" />
          </button>
          {plans && plans.length > 0 && (
            <span
              className="rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums"
              style={{ background: "var(--site-surface-08)", color: "var(--site-text-65)" }}
            >
              {plans.length}
            </span>
          )}
          <span
            className="mt-1 text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--site-text-45)", writingMode: "vertical-rl" }}
          >
            {t("editRoute")}
          </span>
        </div>
      )}

      {/* ── Left: search + results (hidden on desktop when collapsed) ── */}
      <div className={`min-w-0 ${panelCollapsed ? "lg:hidden" : ""}`}>
        <h2 className="text-2xl font-bold" style={{ color: "var(--site-text)" }}>{t("planTitle")}</h2>
        <p className="mt-1 text-[14px]" style={{ color: "var(--site-text-50)" }}>{t("planSubtitle")}</p>

        {/* Transport-mode legend */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { icon: Footprints, label: t("walk"), color: "var(--site-text-50)" },
            { icon: Bus, label: t("bus"), color: "#0891B2" },
            { icon: TrainFront, label: t("metro"), color: "#7C3AED" },
          ].map(({ icon: Icon, label, color }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
              style={{ background: "var(--site-surface-08)", color: "var(--site-text-65)" }}
            >
              <Icon className="size-3.5" style={{ color }} />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-6">
          <div className="relative flex flex-col gap-2.5">
            {renderField("from")}
            {renderField("to")}
            {/* Vertical connector + swap */}
            <button
              type="button"
              onClick={swap}
              aria-label={t("swap")}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full transition-transform hover:rotate-180"
              style={{ background: "var(--site-bg-surface)", border: "1px solid var(--site-border-10)", color: "var(--site-text-60)" }}
            >
              <ArrowDownUp className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={plan}
            disabled={!canPlan}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            style={{ background: "#0891B2", boxShadow: canPlan ? "0 4px 20px rgba(8,145,178,0.3)" : "none" }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? t("planning") : t("plan")}
          </button>
        </div>

        {/* ── Results list ── */}
        <div className="mt-8">
          {loading && (
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[132px] animate-pulse rounded-2xl"
                  style={{ background: "var(--site-bg-elevated)", border: "1px solid var(--site-border-06)" }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              className="flex items-start gap-3 rounded-2xl p-5 text-[14px]"
              style={{ background: "rgba(181,39,29,0.1)", border: "1px solid rgba(181,39,29,0.2)", color: "#e06a60" }}
            >
              <Route className="mt-0.5 size-5 shrink-0" />
              <span>{t("unavailable")}</span>
            </div>
          )}

          {!loading && plans && plans.length === 0 && !error && (
            <EmptyResults title={t("noResults")} hint={t("noResultsHint")} />
          )}

          {!loading && !plans && !error && (
            <EmptyResults idle title={t("idleTitle")} hint={t("idleHint")} />
          )}

          {!loading && plans && plans.length > 0 && (
            <div className="flex flex-col gap-4">
              {plans.map((p) => (
                <JourneyCard
                  key={p.id}
                  plan={p}
                  locale={locale}
                  selected={p.id === selectedId}
                  onSelect={() => setSelectedId(p.id)}
                  onGo={() => { setSelectedId(p.id); setPanelCollapsed(true); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: map (sticky on desktop) ── */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="relative h-[420px] lg:h-[calc(100vh-8rem)]">
          <JourneyMap
            plan={selectedPlan}
            userCoords={userCoords}
            tracking={tracking}
            recenterTick={recenterTick}
          />
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={tracking ? stop : watch}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
              style={{
                background: tracking ? "#0891B2" : "var(--site-header-bg)",
                border: "1px solid var(--site-border-10)",
                color: tracking ? "#fff" : "var(--site-text-65)",
              }}
            >
              <Crosshair className="size-3.5" />
              {tracking ? t("stopFollowing") : t("followMe")}
            </button>
            {tracking && userCoords && (
              <button
                type="button"
                onClick={() => setRecenterTick((n) => n + 1)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium shadow-lg backdrop-blur transition-colors"
                style={{ background: "var(--site-header-bg)", border: "1px solid var(--site-border-10)", color: "var(--site-text-65)" }}
              >
                <LocateFixed className="size-3.5" />
                {t("recenter")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyResults({ title, hint, idle }: { title: string; hint: string; idle?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center"
      style={{
        background: idle ? "transparent" : "var(--site-bg-elevated)",
        border: `1px dashed ${idle ? "var(--site-border-10)" : "var(--site-border-06)"}`,
      }}
    >
      <span className="grid size-12 place-items-center rounded-full" style={{ background: "var(--site-surface-08)" }}>
        <Route className="size-5" style={{ color: "var(--site-text-40)" }} />
      </span>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--site-text)" }}>{title}</p>
      <p className="mt-1 max-w-xs text-[13px]" style={{ color: "var(--site-text-50)" }}>{hint}</p>
    </div>
  );
}
