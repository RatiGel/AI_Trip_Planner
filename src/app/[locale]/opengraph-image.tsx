import { ImageResponse } from "next/og";

export const alt = "ExploreTbilisi — Discover Tbilisi, Georgia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social-share card for every route segment under [locale].
// Per-page metadata can still override with a more specific image.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0A0A0A 0%, #1a1410 55%, #3a2410 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #f5a623, #e2711d)",
              fontSize: 34,
              fontWeight: 700,
              color: "#0A0A0A",
            }}
          >
            T
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            ExploreTbilisi
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Discover Tbilisi, Georgia
          </div>
          <div
            style={{
              fontSize: 34,
              color: "#e0d6c8",
              maxWidth: 820,
              lineHeight: 1.3,
            }}
          >
            AI trip planner, attractions, food, neighborhoods, maps & routes.
          </div>
        </div>

        <div style={{ fontSize: 26, color: "#f5a623", fontWeight: 600 }}>
          www.exploretbilisi.online
        </div>
      </div>
    ),
    { ...size },
  );
}
