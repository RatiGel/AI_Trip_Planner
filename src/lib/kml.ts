import type { RoutePlan } from "@/types";

/** Escape text for safe embedding in XML. */
function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "#RRGGBB" → KML "aabbggrr" (alpha + reversed channels). */
function kmlColor(hex: string, alpha = "ff"): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const rgb = m ? m[1] : "b5271d";
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `${alpha}${b}${g}${r}`.toLowerCase();
}

/**
 * Build a KML document from a route plan. One folder per day with numbered
 * point placemarks and a connecting line, colored per the day's color.
 * Importable into Google My Maps (maps.google.com/mymaps → Import).
 */
export function planToKml(plan: RoutePlan): string {
  const styles: string[] = [];
  const folders: string[] = [];

  plan.days.forEach((day) => {
    const color = kmlColor(day.color);
    const lineStyleId = `line-d${day.day}`;
    const pinStyleId = `pin-d${day.day}`;

    styles.push(
      `<Style id="${lineStyleId}"><LineStyle><color>${color}</color><width>4</width></LineStyle></Style>`,
      `<Style id="${pinStyleId}"><IconStyle><color>${color}</color><scale>1.1</scale>` +
        `<Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`,
    );

    const placemarks = day.stops
      .filter((s) => s.place.geo && Number.isFinite(s.place.geo.lat) && Number.isFinite(s.place.geo.lng))
      .map((s) => {
        const { lat, lng, address } = s.place.geo;
        const desc = [
          s.reason,
          address,
          `${s.arrival}–${s.departure}`,
        ]
          .filter(Boolean)
          .join(" • ");
        return (
          `<Placemark><name>${s.order}. ${xml(s.place.name)}</name>` +
          `<description>${xml(desc)}</description>` +
          `<styleUrl>#${pinStyleId}</styleUrl>` +
          `<Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`
        );
      });

    const coords = day.stops
      .filter((s) => s.place.geo && Number.isFinite(s.place.geo.lat) && Number.isFinite(s.place.geo.lng))
      .map((s) => `${s.place.geo.lng},${s.place.geo.lat},0`)
      .join(" ");

    const line =
      day.stops.length > 1 && coords
        ? `<Placemark><name>${xml(`Day ${day.day} route`)}</name>` +
          `<styleUrl>#${lineStyleId}</styleUrl>` +
          `<LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString></Placemark>`
        : "";

    folders.push(
      `<Folder><name>${xml(`Day ${day.day}`)}</name>${placemarks.join("")}${line}</Folder>`,
    );
  });

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<name>${xml(plan.title)}</name>` +
    styles.join("") +
    folders.join("") +
    `</Document></kml>`
  );
}

/** Trigger a browser download of the plan as a .kml file. */
export function downloadKml(plan: RoutePlan): void {
  const kml = planToKml(plan);
  const blob = new Blob([kml], {
    type: "application/vnd.google-earth.kml+xml",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug =
    plan.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trip";
  a.href = url;
  a.download = `${slug}.kml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
