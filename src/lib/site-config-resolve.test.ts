import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveHeader, resolveFooter, resolvePage } from "./site-config-resolve";
import { DEFAULT_HEADER, DEFAULT_FOOTER, DEFAULT_PAGES, NEUTRAL_PAGE } from "./site-config-defaults";

test("an absent config resolves to the hardcoded defaults", () => {
  assert.deepEqual(resolveHeader(undefined), DEFAULT_HEADER);
  assert.deepEqual(resolveHeader(null), DEFAULT_HEADER);
  assert.deepEqual(resolveFooter(undefined), DEFAULT_FOOTER);
  assert.deepEqual(resolvePage(undefined, "home"), DEFAULT_PAGES.home);
});

test("empty arrays fall back rather than blanking the nav", () => {
  const h = resolveHeader({ logoText: "", logoImageUrl: "", navLinks: [] });
  assert.deepEqual(h.navLinks, DEFAULT_HEADER.navLinks, "empty navLinks must not blank the header");
  assert.equal(h.logoText, DEFAULT_HEADER.logoText);

  const f = resolveFooter({ copyrightText: "", columns: [], socialLinks: [] });
  assert.deepEqual(f.columns, DEFAULT_FOOTER.columns, "empty columns must not blank the footer");
  assert.equal(f.copyrightText, DEFAULT_FOOTER.copyrightText);
});

test("provided values win over defaults", () => {
  const h = resolveHeader({
    logoText: "MyCity",
    logoImageUrl: "/logo.png",
    navLinks: [{ label: "Eat", href: "/food" }],
  });
  assert.equal(h.logoText, "MyCity");
  assert.equal(h.logoImageUrl, "/logo.png");
  assert.deepEqual(h.navLinks, [{ label: "Eat", href: "/food" }]);
});

test("malformed nav entries are dropped, and a fully malformed list falls back", () => {
  const h = resolveHeader({
    navLinks: [
      { label: "Good", href: "/good" },
      { label: "", href: "/no-label" },
      { label: "No href", href: "" },
      "nonsense",
      null,
    ],
  });
  assert.deepEqual(h.navLinks, [{ label: "Good", href: "/good" }]);

  const allBad = resolveHeader({ navLinks: [null, "x", { label: "", href: "" }] });
  assert.deepEqual(allBad.navLinks, DEFAULT_HEADER.navLinks);
});

test("page toggles default to true and honour an explicit false", () => {
  const d = resolvePage({}, "home");
  assert.equal(d.showCategories, true);
  assert.equal(d.showFeaturedPlaces, true);

  const off = resolvePage({ showCategories: false, showFeaturedPlaces: false }, "home");
  assert.equal(off.showCategories, false);
  assert.equal(off.showFeaturedPlaces, false);
});

test("hero text falls back per field, not all-or-nothing", () => {
  const p = resolvePage({ heroTitle: "Custom title" }, "home");
  assert.equal(p.heroTitle, "Custom title");
  assert.equal(p.heroSubtitle, DEFAULT_PAGES.home.heroSubtitle);
  assert.equal(p.heroImageUrl, DEFAULT_PAGES.home.heroImageUrl);
});

test("an unknown page key resolves to neutral empty text with toggles on", () => {
  const p = resolvePage(undefined, "some-page-with-no-defaults");
  assert.equal(p.heroTitle, "");
  assert.equal(p.showCategories, true);
});

test("a Mongoose Map-shaped pages value is read correctly", () => {
  // getSiteConfig().pages may arrive as a Map when not fully lean-converted.
  const asMap = new Map([["home", { heroTitle: "From a Map" }]]);
  assert.equal(resolvePage(asMap.get("home"), "home").heroTitle, "From a Map");
});

test("a page key naming an inherited Object.prototype property falls back to NEUTRAL_PAGE", () => {
  // DEFAULT_PAGES is looked up by an admin-typed CMS key. Indexing a plain
  // object literal with an untrusted key can accidentally resolve inherited
  // Object.prototype members instead of falling through to the neutral base.
  assert.deepEqual(resolvePage(undefined, "__proto__"), NEUTRAL_PAGE);
  assert.deepEqual(resolvePage(undefined, "constructor"), NEUTRAL_PAGE);
  assert.deepEqual(resolvePage(undefined, "toString"), NEUTRAL_PAGE);
});

test("footer columns: a malformed column is dropped while a valid sibling column is kept", () => {
  const f = resolveFooter({
    columns: [
      { heading: "H", links: [] },
      { heading: "Valid", links: [{ label: "L", href: "/h" }] },
    ],
  });
  assert.deepEqual(f.columns, [{ heading: "Valid", links: [{ label: "L", href: "/h" }] }]);
});

test("retired schema defaults are treated as unconfigured, not as content", () => {
  // The SiteConfig schema used to stamp these onto every new document. Nobody
  // chose them and they do not match what the site renders, so honoring them
  // silently downgraded the live branding.
  const h = resolveHeader({ logoText: "TbilisiTrip", logoImageUrl: "", navLinks: [] });
  assert.equal(h.logoText, DEFAULT_HEADER.logoText, "stale logoText must fall back");

  const f = resolveFooter({ copyrightText: "© 2025 TbilisiTrip", columns: [], socialLinks: [] });
  assert.equal(
    f.copyrightText,
    DEFAULT_FOOTER.copyrightText,
    "stale copyrightText must fall back so the footer computes the live year"
  );
});

test("a genuinely configured logo and copyright still win", () => {
  const h = resolveHeader({ logoText: "MyCity", logoImageUrl: "", navLinks: [] });
  assert.equal(h.logoText, "MyCity");

  const f = resolveFooter({ copyrightText: "© 2031 MyCity", columns: [], socialLinks: [] });
  assert.equal(f.copyrightText, "© 2031 MyCity");
});
