/**
 * Locale-aware picker for DB content fields.
 *
 * Records carry `name`/`nameKa`/`nameRu` (and the description equivalents).
 * Pages used to branch `locale === "ka" ? x.nameKa : x.name`, which silently
 * served English on /ru — 179 sitemap URLs that were byte-identical to their
 * /en twins. Google saw duplicates and stopped spending crawl budget, which is
 * the bulk of "Discovered - currently not indexed".
 *
 * Falls back to the English field when a translation is missing, so a partially
 * translated record still renders. Use `hasTranslation` to decide whether a URL
 * deserves to be in the sitemap at all — an untranslated page is a duplicate,
 * and duplicates should not be advertised to Google.
 */

/**
 * Any record carrying localized fields. Deliberately not `Record<string, unknown>` —
 * TS interfaces (Place, City) have no implicit index signature and would not match.
 */
type Localized = object;

function readField(doc: Localized, key: string): unknown {
  return (doc as Record<string, unknown>)[key];
}

/** Read `base` for en, `${base}Ka` / `${base}Ru` otherwise, falling back to `base`. */
export function pickLocalized(
  doc: Localized | null | undefined,
  base: string,
  locale: string,
): string {
  if (!doc) return "";
  const suffix = locale === "ka" ? "Ka" : locale === "ru" ? "Ru" : "";
  const localized = suffix ? readField(doc, `${base}${suffix}`) : undefined;
  if (typeof localized === "string" && localized.trim()) return localized;
  const fallback = readField(doc, base);
  return typeof fallback === "string" ? fallback : "";
}

/**
 * True when the record has real translated copy for this locale.
 * English is always "translated". Requires BOTH a name and a description so a
 * half-filled record doesn't get advertised as a distinct page.
 */
export function hasTranslation(doc: Localized | null | undefined, locale: string): boolean {
  if (!doc) return false;
  if (locale === "en") return true;
  const suffix = locale === "ka" ? "Ka" : "Ru";
  const name = readField(doc, `name${suffix}`);
  const description = readField(doc, `description${suffix}`);
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof description === "string" &&
    description.trim().length > 0
  );
}
