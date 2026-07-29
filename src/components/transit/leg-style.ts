import type { JourneyLeg } from "@/types/transit";

// Shared map styling for transit legs. Used by both the standalone journey map
// (/travel-info) and the itinerary map's TTC view, so a bus line looks the same
// in both places.

/** Every walked segment draws in this grey, routed or fallback. */
export const WALK_COLOR = "#94a3b8";

export function legColor(leg: JourneyLeg): string {
  if (leg.mode === "walk") return WALK_COLOR;
  if (leg.color) return `#${leg.color}`;
  if (leg.mode === "metro") return "#7C3AED";
  if (leg.mode === "bus") return "#0891B2";
  return "#64748b";
}

// Inline SVG glyphs (lucide Bus / TramFront paths) for map markers — the map
// libs render raw HTML, so we can't use the React icon components here.
const BUS_SVG =
  '<path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M11 18h5" fill="none"/><circle cx="7" cy="18" r="2" fill="none"/><circle cx="17" cy="18" r="2" fill="none"/>';
const TRAM_SVG =
  '<rect width="16" height="16" x="4" y="3" rx="2" fill="none"/><path d="M4 11h16M12 3v8M8 19l-2 3M18 22l-2-3M2 21h20" fill="none"/><circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/>';

/**
 * Marker HTML for a transit boarding stop — a colored teardrop pin with the
 * mode glyph inside. `color` is the leg's brand/mode color.
 */
export function stopMarkerHTML(mode: JourneyLeg["mode"], color: string, size = 30): string {
  const glyph = mode === "metro" ? TRAM_SVG : BUS_SVG;
  const icon = Math.round(size * 0.53);
  return (
    `<div style="position:relative;width:${size}px;height:${size}px;">` +
    `<div style="width:${size}px;height:${size}px;border-radius:9999px 9999px 9999px 2px;transform:rotate(45deg);` +
    `background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${icon}" height="${icon}" viewBox="0 0 24 24" ` +
    `stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;">${glyph}</svg>` +
    `</div>`
  );
}
