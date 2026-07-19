# SEO Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sitemap/robots, per-page metadata (title/description/canonical/hreflang/OG), schema.org structured data, internal linking, and traveler-question FAQ content across the site's core public pages, targeting the user's Tbilisi tourism keyword set.

**Architecture:** A shared `src/lib/seo.ts` helper builds `Metadata` objects (canonical + hreflang + OpenGraph/Twitter) from a `{locale, path, title, description}` input, used by every page's new `generateMetadata`. A shared `src/components/site/json-ld.tsx` renders `<script type="application/ld+json">` from plain objects. `src/app/sitemap.ts` and `src/app/robots.ts` (Next.js file conventions, live outside `[locale]`) generate `/sitemap.xml` and `/robots.txt`. New `next-intl` message namespaces (`homePage.meta`, `foodPage.meta`/`faq`/`related`, etc.) carry per-page SEO copy in all 3 locales, following the exact shape already used by `travelInfoPage.meta`/`faq`/`related`.

**Tech Stack:** Next.js 16.2.6 (App Router, file-based `sitemap.ts`/`robots.ts`, `generateMetadata`), next-intl 4, MongoDB/Mongoose (`CityModel`, `PlaceModel`).

## Global Constraints

- Canonical domain: `https://exploretbilisi.online` (apex, no `www`).
- Locales: `en`, `ka`, `ru` (default `en`), `localePrefix: "always"` — every URL has a locale prefix (`/en/...`, `/ka/...`, `/ru/...`).
- `params` in page/layout props is a `Promise` in Next.js 16 — always `await` it.
- `sitemap.ts`/`robots.ts` are root-level file conventions — they live at `src/app/sitemap.ts` and `src/app/robots.ts`, **not** under `src/app/[locale]/`.
- Add new translation keys to all three message files (`messages/en.json`, `messages/ka.json`, `messages/ru.json`) together — never just one locale.
- Only these pages are in scope: `/`, `/cities`, `/cities/[slug]`, `/places/[slug]`, `/food`, `/discover`, `/events`, `/experiences`, `/travel-info`, `/map`, `/planner`. Admin/business/superadmin/auth/reservation/payment/trips/tickets/deals/list-your-business pages are excluded from the sitemap and disallowed in robots.
- No test suite is configured in this repo — verification is manual (`npm run build`, visual/view-source checks), per CLAUDE.md.
- Reuse the existing `FaqAccordion` and `RelatedLinks` component patterns (from `src/components/site/travel-info/`) rather than inventing new ones — copy their shape (`t.raw("items")` returning `{q,a}[]` for FAQ, `{icon,title,desc,href,cta}[]` for related links).
- Do not modify the hardcoded English content arrays inside `/food`, `/discover`, `/experiences`, `/events` page bodies (`PLACES`, `EXPERIENCES`, `EVENTS` consts) — those pages aren't i18n'd yet and retrofitting them is out of scope. Only add new metadata/FAQ/related-links sections wired to new translation namespaces.

---

## File Structure

**New files:**
- `src/lib/seo.ts` — `buildMetadata()` helper
- `src/components/site/json-ld.tsx` — `JsonLd` component
- `src/app/sitemap.ts` — sitemap generator
- `src/app/robots.ts` — robots generator
- `src/components/site/faq-block.tsx` — generic FAQ accordion + `FAQPage` JSON-LD, parameterized by translation namespace (generalizes the travel-info-specific `FaqAccordion`)
- `src/components/site/related-guides.tsx` — generic related-links block, parameterized by translation namespace (generalizes `RelatedLinks`)

**Modified files:**
- `messages/en.json`, `messages/ka.json`, `messages/ru.json` — new `site.name`/`site.tagline`, new `homePage`, `foodPage`, `discoverPage`, `experiencesPage`, `eventsPage` namespaces (each with `meta`, `faq`, `related` sub-keys), extend `travelInfoPage` with `faq.schema`-ready content (content already exists, just adding JSON-LD wiring, no copy change needed there)
- `src/app/[locale]/layout.tsx` — add `metadataBase`, root `alternates`
- `src/app/[locale]/page.tsx` (home) — add `generateMetadata`, `WebSite`+`Organization` JSON-LD
- `src/app/[locale]/food/page.tsx` — add `generateMetadata`, `ItemList`/`Restaurant` JSON-LD, FAQ + related-guides sections
- `src/app/[locale]/discover/page.tsx` — add `generateMetadata`, `ItemList`/`TouristAttraction` JSON-LD, FAQ + related-guides sections
- `src/app/[locale]/experiences/page.tsx` — add `generateMetadata`, `ItemList`/`TouristAttraction` JSON-LD, FAQ + related-guides sections
- `src/app/[locale]/events/page.tsx` — add `generateMetadata`, `ItemList`/`Event` JSON-LD, FAQ + related-guides sections
- `src/app/[locale]/travel-info/page.tsx` — add `FAQPage` JSON-LD (reuse existing `FaqAccordion` content via new shared component or leave existing component and just inject JSON-LD alongside it — decided: leave `FaqAccordion` as-is, add `JsonLd` directly in the page since content already exists)
- `src/app/[locale]/cities/page.tsx` — add `generateMetadata`
- `src/app/[locale]/cities/[slug]/page.tsx` — add `generateMetadata`, `TouristDestination` JSON-LD
- `src/app/[locale]/places/[slug]/page.tsx` — add `generateMetadata`, `TouristAttraction` JSON-LD
- `src/app/[locale]/map/page.tsx` — add `generateMetadata`
- `src/app/[locale]/planner/page.tsx` — add `generateMetadata`

---

### Task 1: SEO metadata helper + JSON-LD component

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/components/site/json-ld.tsx`

**Interfaces:**
- Produces: `buildMetadata(input: { locale: string; path: string; title: string; description: string; image?: string }): Metadata` — used by every subsequent task's `generateMetadata`.
- Produces: `JsonLd({ data }: { data: object }): JSX.Element` — used by every subsequent task that adds structured data.

- [ ] **Step 1: Write `src/lib/seo.ts`**

```ts
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = "https://exploretbilisi.online";

function localizedPath(locale: string, path: string) {
  const clean = path === "/" ? "" : path;
  return `${SITE_URL}/${locale}${clean}`;
}

export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localizedPath(l, path);
  }

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath(locale, path),
      languages,
    },
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: "ExploreTbilisi",
      locale,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export { SITE_URL };
```

- [ ] **Step 2: Write `src/components/site/json-ld.tsx`**

```tsx
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no new errors referencing `src/lib/seo.ts` or `src/components/site/json-ld.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/seo.ts src/components/site/json-ld.tsx
git commit -m "feat(seo): add metadata builder and JSON-LD component"
```

---

### Task 2: Sitemap and robots

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`

**Interfaces:**
- Consumes: `routing.locales` from `src/i18n/routing.ts` (`["en","ka","ru"]`); `SITE_URL` from `src/lib/seo.ts`; `connectDB` from `src/lib/db.ts`; `CityModel` from `src/lib/models/city`; `PlaceModel` from `src/lib/models/place`; `PUBLISHED` from `src/lib/places/published`.
- Produces: `/sitemap.xml`, `/robots.txt` routes.

- [ ] **Step 1: Write `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { PlaceModel } from "@/lib/models/place";
import { PUBLISHED } from "@/lib/places/published";
import { SITE_URL } from "@/lib/seo";

const STATIC_PATHS = [
  "",
  "/cities",
  "/food",
  "/discover",
  "/events",
  "/experiences",
  "/travel-info",
  "/map",
  "/planner",
];

function entry(path: string, locale: string): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}${path}`;
  }
  return {
    url: `${SITE_URL}/${locale}${path}`,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  const cities = (await CityModel.find({}).select("slug").lean()) as unknown as {
    slug: string;
  }[];
  const places = (await PlaceModel.find(PUBLISHED)
    .select("slug")
    .lean()) as unknown as { slug: string }[];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push(entry(path, locale));
    }
    for (const city of cities) {
      entries.push(entry(`/cities/${city.slug}`, locale));
    }
    for (const place of places) {
      entries.push(entry(`/places/${place.slug}`, locale));
    }
  }

  return entries;
}
```

- [ ] **Step 2: Write `src/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/business",
        "/superadmin",
        "/api",
        "/login",
        "/register",
        "/profile",
        "/reservations",
        "/reserve",
        "/trips",
        "/tickets",
        "/payment",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Run dev server and check output**

Run: `npm run dev`
Then visit `http://localhost:3000/sitemap.xml` and `http://localhost:3000/robots.txt`.
Expected: sitemap XML lists all static paths × 3 locales plus DB-backed city/place slugs with hreflang alternates; robots.txt lists the disallowed paths and the sitemap URL.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts
git commit -m "feat(seo): add sitemap.xml and robots.txt"
```

---

### Task 3: Shared FAQ block and related-guides components

**Files:**
- Create: `src/components/site/faq-block.tsx`
- Create: `src/components/site/related-guides.tsx`

**Interfaces:**
- Consumes: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` from `src/components/ui/accordion`; `Link` from `@/i18n/navigation`; `Icon` from `src/components/site/travel-info/icon-map` (existing icon lookup, reused as-is).
- Produces: `FaqBlock({ namespace }: { namespace: string })` — client component, reads `t.raw("items")` as `{q,a}[]` from the given i18n namespace, renders an accordion AND returns the raw items so callers can build `FAQPage` JSON-LD (component itself does not emit JSON-LD, since it's a client component and JSON-LD must be server-rendered — the JSON-LD is added by the parent server page using a sibling server-side translation read, per Step 3 below).
- Produces: `RelatedGuides({ namespace }: { namespace: string })` — async server component, reads `{icon,title,desc,href,cta}[]` from `t.raw("items")` under `<namespace>.related`, plus `<namespace>.related.heading`/`sub`.

- [ ] **Step 1: Write `src/components/site/faq-block.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type Faq = { q: string; a: string };

export function FaqBlock({ namespace }: { namespace: string }) {
  const t = useTranslations(namespace);
  const items = (t.raw("items") ?? []) as Faq[];

  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h2
          className="font-display mb-3 text-center leading-tight"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1px" }}
        >
          {t("heading")}
        </h2>
        <p className="mb-10 text-center text-base leading-relaxed opacity-60">
          {t("sub")}
        </p>
        <div className="rounded-2xl border px-6 md:px-8" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Accordion>
            {items.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="py-5 text-base">{faq.q}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-[15px] leading-relaxed opacity-70">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write `src/components/site/related-guides.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/site/travel-info/icon-map";

type Related = { icon: string; title: string; desc: string; href: string; cta: string };

export async function RelatedGuides({ namespace }: { namespace: string }) {
  const t = await getTranslations(namespace);
  const items = (t.raw("items") ?? []) as Related[];

  return (
    <section className="px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display mb-3 leading-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-1px" }}>
            {t("heading")}
          </h2>
          <p className="text-base leading-relaxed opacity-60">{t("sub")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl" style={{ background: "rgba(232,160,32,0.14)", color: "#F5C842" }}>
                <Icon name={item.icon} className="size-6" />
              </div>
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed opacity-60">{item.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: "#F5C842" }}>
                {item.cta}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/faq-block.tsx src/components/site/related-guides.tsx
git commit -m "feat(seo): add reusable FAQ and related-guides components"
```

---

### Task 4: Translation keys — site identity + new page namespaces

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ka.json`
- Modify: `messages/ru.json`

**Interfaces:**
- Produces: `site.name`/`site.tagline` (rewritten); `homePage.meta.{title,description}`; `foodPage.meta.{title,description}`, `foodPage.faq.{heading,sub,items}`, `foodPage.related.{heading,sub,items}`; same trio for `discoverPage`, `experiencesPage`, `eventsPage`. Every namespace's `items` for FAQ is `{q,a}[]`; for `related` is `{icon,title,desc,href,cta}[]`.
- Consumed by: Tasks 5–9 (`generateMetadata` calls read `*.meta`; `FaqBlock`/`RelatedGuides` read `*.faq`/`*.related`).

- [ ] **Step 1: Update `site` block in all three files**

In `messages/en.json`, replace:
```json
  "site": {
    "name": "TbilisiTrip",
    "tagline": "Your AI-powered guide to Georgia"
  },
```
with:
```json
  "site": {
    "name": "ExploreTbilisi",
    "tagline": "Tbilisi Travel Guide & AI-Powered Trip Planner"
  },
```

In `messages/ka.json`, replace:
```json
  "site": {
    "name": "TbilisiTrip",
    "tagline": "თქვენი AI-გიდი საქართველოში"
  },
```
with:
```json
  "site": {
    "name": "ExploreTbilisi",
    "tagline": "თბილისის სამოგზაურო გზამკვლევი და AI მოგზაურობის დამგეგმავი"
  },
```

In `messages/ru.json`, replace:
```json
  "site": {
    "name": "TbilisiTrip",
    "tagline": "Ваш AI-гид по Грузии"
  },
```
with:
```json
  "site": {
    "name": "ExploreTbilisi",
    "tagline": "Путеводитель по Тбилиси и ИИ-планировщик поездок"
  },
```

- [ ] **Step 2: Add `homePage` namespace to `messages/en.json`** (insert after the `"home"` block)

```json
  "homePage": {
    "meta": {
      "title": "Tbilisi Travel Guide & AI Trip Planner",
      "description": "Plan your perfect Tbilisi itinerary with our free AI trip planner. Discover top attractions, restaurants, day trips, and things to do in Tbilisi, Georgia."
    }
  },
```

Add to `messages/ka.json`:
```json
  "homePage": {
    "meta": {
      "title": "თბილისის სამოგზაურო გზამკვლევი და AI მოგზაურობის დამგეგმავი",
      "description": "დაგეგმეთ თქვენი იდეალური მოგზაურობა თბილისში ჩვენი უფასო AI დამგეგმავით. აღმოაჩინეთ თბილისის მთავარი ღირსშესანიშნაობები, რესტორნები, ერთდღიანი მოგზაურობები."
    }
  },
```

Add to `messages/ru.json`:
```json
  "homePage": {
    "meta": {
      "title": "Путеводитель по Тбилиси и ИИ-планировщик поездок",
      "description": "Спланируйте идеальную поездку в Тбилиси с помощью бесплатного ИИ-планировщика. Лучшие достопримечательности, рестораны и однодневные поездки из Тбилиси."
    }
  },
```

- [ ] **Step 2: Verify JSON is valid**

Run: `python3 -c "import json; [json.load(open(f'messages/{l}.json')) for l in ['en','ka','ru']]; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Add `foodPage` namespace to `messages/en.json`** (insert after `homePage`)

```json
  "foodPage": {
    "meta": {
      "title": "Best Restaurants & Cafés in Tbilisi — Georgian Food & Wine Guide",
      "description": "Where to eat in Tbilisi: the best Georgian restaurants, cafés, wine bars, and nightlife spots, hand-picked for real travelers."
    },
    "faq": {
      "heading": "Food & Drink FAQs",
      "sub": "What travelers ask before eating out in Tbilisi.",
      "items": [
        {
          "q": "What is the best area to eat in Tbilisi?",
          "a": "Vera and Old Town have the highest concentration of well-reviewed restaurants and cafés, while Marjanishvili and Fabrika are best for wine bars and nightlife."
        },
        {
          "q": "What food is Tbilisi famous for?",
          "a": "Khinkali (soup dumplings), khachapuri (cheese bread), and natural Georgian wine are the essentials — most restaurants on this list serve all three."
        },
        {
          "q": "Is Tbilisi nightlife good?",
          "a": "Yes — Tbilisi has a well-known techno and rooftop bar scene, especially around Marjanishvili and Fabrika, alongside more relaxed wine bars in Old Town."
        },
        {
          "q": "Do restaurants in Tbilisi accept cards?",
          "a": "Cards are accepted almost everywhere in the city center, though smaller wine bars and food halls may prefer cash."
        }
      ]
    },
    "related": {
      "heading": "Plan the rest of your trip",
      "sub": "More guides to round out your Tbilisi itinerary.",
      "items": [
        {
          "icon": "compass",
          "title": "Things to Do",
          "desc": "City tours, wine tastings, and unique experiences in Tbilisi.",
          "href": "/experiences",
          "cta": "See experiences"
        },
        {
          "icon": "map-pin",
          "title": "Main Attractions",
          "desc": "The must-see sights and neighborhoods in Tbilisi.",
          "href": "/discover",
          "cta": "Explore attractions"
        },
        {
          "icon": "info",
          "title": "Travel Guide",
          "desc": "Transport, safety, and first-time visitor essentials.",
          "href": "/travel-info",
          "cta": "Read the guide"
        }
      ]
    }
  },
```

Add to `messages/ka.json`:
```json
  "foodPage": {
    "meta": {
      "title": "თბილისის საუკეთესო რესტორნები და კაფეები — ქართული სამზარეულოსა და ღვინის გზამკვლევი",
      "description": "სად ჭამოთ თბილისში: საუკეთესო ქართული რესტორნები, კაფეები, ღვინის ბარები და ღამის ცხოვრება."
    },
    "faq": {
      "heading": "კვების და სასმელის ხშირად დასმული კითხვები",
      "sub": "რას ეკითხებიან მოგზაურები რესტორანში წასვლამდე.",
      "items": [
        {
          "q": "სად არის საუკეთესო ადგილი საჭმელად თბილისში?",
          "a": "ვერასა და ძველ თბილისში ყველაზე მეტი მაღალრეიტინგული რესტორანია, ხოლო მარჯანიშვილი და ფაბრიკა საუკეთესოა ღვინის ბარებისა და ღამის ცხოვრებისთვის."
        },
        {
          "q": "რომელი კერძებით არის ცნობილი თბილისი?",
          "a": "ხინკალი, ხაჭაპური და ბუნებრივი ქართული ღვინო — ძირითადი კერძებია, რომლებსაც ამ სიის თითქმის ყველა რესტორანი გთავაზობთ."
        },
        {
          "q": "კარგია თბილისის ღამის ცხოვრება?",
          "a": "დიახ — თბილისს აქვს ცნობილი ტექნო და სახურავის ბარების სცენა, განსაკუთრებით მარჯანიშვილსა და ფაბრიკაში."
        },
        {
          "q": "იღებენ თუ არა ბარათებს თბილისის რესტორნები?",
          "a": "ბარათებს იღებენ ქალაქის ცენტრში თითქმის ყველგან, თუმცა მცირე ღვინის ბარებში ნაღდი ფული შეიძლება იყოს სასურველი."
        }
      ]
    },
    "related": {
      "heading": "დაგეგმეთ დანარჩენი მოგზაურობა",
      "sub": "მეტი გზამკვლევი თქვენი თბილისის მარშრუტისთვის.",
      "items": [
        {
          "icon": "compass",
          "title": "გასართობი აქტივობები",
          "desc": "ქალაქის ტურები, ღვინის დეგუსტაციები და უნიკალური გამოცდილებები.",
          "href": "/experiences",
          "cta": "იხილეთ აქტივობები"
        },
        {
          "icon": "map-pin",
          "title": "მთავარი ღირსშესანიშნაობები",
          "desc": "თბილისის აუცილებელი სანახაობები და უბნები.",
          "href": "/discover",
          "cta": "აღმოაჩინეთ"
        },
        {
          "icon": "info",
          "title": "სამოგზაურო გზამკვლევი",
          "desc": "ტრანსპორტი, უსაფრთხოება და პირველად ჩამოსულთათვის საჭირო ინფორმაცია.",
          "href": "/travel-info",
          "cta": "წაიკითხეთ გზამკვლევი"
        }
      ]
    }
  },
```

Add to `messages/ru.json`:
```json
  "foodPage": {
    "meta": {
      "title": "Лучшие рестораны и кафе Тбилиси — гид по грузинской кухне и вину",
      "description": "Где поесть в Тбилиси: лучшие грузинские рестораны, кафе, винные бары и ночная жизнь, отобранные для путешественников."
    },
    "faq": {
      "heading": "Вопросы о еде и напитках",
      "sub": "Что спрашивают путешественники перед походом в ресторан.",
      "items": [
        {
          "q": "Какой район Тбилиси лучший для еды?",
          "a": "В Вере и Старом городе больше всего ресторанов и кафе с высокими оценками, а Марджанишвили и Фабрика лучше всего подходят для винных баров и ночной жизни."
        },
        {
          "q": "Какой едой славится Тбилиси?",
          "a": "Хинкали, хачапури и натуральное грузинское вино — основные блюда, которые подают почти во всех ресторанах из этого списка."
        },
        {
          "q": "Хорошая ли ночная жизнь в Тбилиси?",
          "a": "Да — в Тбилиси известная техно-сцена и бары на крышах, особенно в районах Марджанишвили и Фабрика."
        },
        {
          "q": "Принимают ли рестораны Тбилиси карты?",
          "a": "Карты принимают почти везде в центре города, но в небольших винных барах может быть предпочтительнее наличные."
        }
      ]
    },
    "related": {
      "heading": "Спланируйте остальную часть поездки",
      "sub": "Больше гидов для вашего маршрута по Тбилиси.",
      "items": [
        {
          "icon": "compass",
          "title": "Чем заняться",
          "desc": "Городские туры, дегустации вин и уникальные впечатления в Тбилиси.",
          "href": "/experiences",
          "cta": "Смотреть активности"
        },
        {
          "icon": "map-pin",
          "title": "Главные достопримечательности",
          "desc": "Обязательные к посещению места и районы Тбилиси.",
          "href": "/discover",
          "cta": "Смотреть достопримечательности"
        },
        {
          "icon": "info",
          "title": "Путеводитель",
          "desc": "Транспорт, безопасность и основы для тех, кто впервые приезжает.",
          "href": "/travel-info",
          "cta": "Читать гид"
        }
      ]
    }
  },
```

- [ ] **Step 4: Verify JSON is valid**

Run: `python3 -c "import json; [json.load(open(f'messages/{l}.json')) for l in ['en','ka','ru']]; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Add `discoverPage` namespace to `messages/en.json`** (insert after `foodPage`)

```json
  "discoverPage": {
    "meta": {
      "title": "Tbilisi Attractions — Must-See Places & Main Attractions",
      "description": "The best Tbilisi attractions: Old Town sights, museums, parks, and neighborhoods. A curated guide to the must-see places in Tbilisi."
    },
    "faq": {
      "heading": "Attractions FAQs",
      "sub": "Common questions about sightseeing in Tbilisi.",
      "items": [
        {
          "q": "What are the must-see attractions in Tbilisi?",
          "a": "Narikala Fortress, the Old Town sulphur baths, Rike Park, and the Bridge of Peace are the most-visited sights, alongside the National Museum and Dry Bridge Market."
        },
        {
          "q": "How many days do you need to see Tbilisi's main attractions?",
          "a": "2-3 days covers the core Old Town sights comfortably; add a day for museums and neighborhood walks if you want a deeper visit."
        },
        {
          "q": "Is Tbilisi walkable?",
          "a": "Yes, the Old Town and central neighborhoods are very walkable, though the cable car and metro help cover longer distances quickly."
        }
      ]
    },
    "related": {
      "heading": "Keep exploring",
      "sub": "More Tbilisi guides to plan your visit.",
      "items": [
        {
          "icon": "utensils",
          "title": "Food & Wine",
          "desc": "Best restaurants, cafés, and wine bars in Tbilisi.",
          "href": "/food",
          "cta": "See where to eat"
        },
        {
          "icon": "compass",
          "title": "Things to Do",
          "desc": "City tours, boats, and unique Tbilisi activities.",
          "href": "/experiences",
          "cta": "See experiences"
        },
        {
          "icon": "sparkles",
          "title": "AI Trip Planner",
          "desc": "Get a personalized day-by-day Tbilisi itinerary.",
          "href": "/planner",
          "cta": "Plan my trip"
        }
      ]
    }
  },
```

Add to `messages/ka.json`:
```json
  "discoverPage": {
    "meta": {
      "title": "თბილისის ღირსშესანიშნაობები — აუცილებელი და მთავარი ადგილები",
      "description": "თბილისის საუკეთესო ღირსშესანიშნაობები: ძველი თბილისის სანახაობები, მუზეუმები, პარკები და უბნები."
    },
    "faq": {
      "heading": "ღირსშესანიშნაობების ხშირად დასმული კითხვები",
      "sub": "ხშირი კითხვები თბილისში დათვალიერების შესახებ.",
      "items": [
        {
          "q": "რომელი ღირსშესანიშნაობებია აუცილებელი სანახავად თბილისში?",
          "a": "ნარიყალას ციხე, ძველი აბანოები, რიყის პარკი და მშვიდობის ხიდი ყველაზე მოწონებული ადგილებია, ეროვნულ მუზეუმთან და მშრალ ხიდთან ერთად."
        },
        {
          "q": "რამდენი დღეა საჭირო თბილისის მთავარი ღირსშესანიშნაობების სანახავად?",
          "a": "2-3 დღე საკმარისია ძველი თბილისის ძირითადი ღირსშესანიშნაობებისთვის."
        },
        {
          "q": "თბილისი ფეხით მოსავლელია?",
          "a": "დიახ, ძველი თბილისი და ცენტრალური უბნები ძალიან მოსახერხებელია ფეხით სეირნობისთვის."
        }
      ]
    },
    "related": {
      "heading": "გააგრძელეთ აღმოჩენა",
      "sub": "მეტი გზამკვლევი თქვენი ვიზიტის დასაგეგმად.",
      "items": [
        {
          "icon": "utensils",
          "title": "საკვები და ღვინო",
          "desc": "საუკეთესო რესტორნები და ღვინის ბარები თბილისში.",
          "href": "/food",
          "cta": "იხილეთ სად ჭამოთ"
        },
        {
          "icon": "compass",
          "title": "გასართობი აქტივობები",
          "desc": "ქალაქის ტურები, ნავები და უნიკალური აქტივობები.",
          "href": "/experiences",
          "cta": "იხილეთ აქტივობები"
        },
        {
          "icon": "sparkles",
          "title": "AI მოგზაურობის დამგეგმავი",
          "desc": "მიიღეთ პერსონალური დღიური მარშრუტი თბილისისთვის.",
          "href": "/planner",
          "cta": "დაგეგმეთ მოგზაურობა"
        }
      ]
    }
  },
```

Add to `messages/ru.json`:
```json
  "discoverPage": {
    "meta": {
      "title": "Достопримечательности Тбилиси — главные и обязательные для посещения места",
      "description": "Лучшие достопримечательности Тбилиси: Старый город, музеи, парки и районы. Гид по обязательным для посещения местам."
    },
    "faq": {
      "heading": "Вопросы о достопримечательностях",
      "sub": "Частые вопросы об осмотре достопримечательностей в Тбилиси.",
      "items": [
        {
          "q": "Какие достопримечательности обязательны к посещению в Тбилиси?",
          "a": "Крепость Нарикала, серные бани Старого города, парк Рике и Мост Мира — самые посещаемые места, наряду с Национальным музеем и Сухим мостом."
        },
        {
          "q": "Сколько дней нужно, чтобы увидеть главные достопримечательности Тбилиси?",
          "a": "2-3 дня достаточно для осмотра основных достопримечательностей Старого города."
        },
        {
          "q": "Удобно ли гулять по Тбилиси пешком?",
          "a": "Да, Старый город и центральные районы очень удобны для пеших прогулок."
        }
      ]
    },
    "related": {
      "heading": "Продолжайте изучение",
      "sub": "Больше гидов для планирования визита.",
      "items": [
        {
          "icon": "utensils",
          "title": "Еда и вино",
          "desc": "Лучшие рестораны и винные бары Тбилиси.",
          "href": "/food",
          "cta": "Где поесть"
        },
        {
          "icon": "compass",
          "title": "Чем заняться",
          "desc": "Городские туры, лодки и уникальные активности.",
          "href": "/experiences",
          "cta": "Смотреть активности"
        },
        {
          "icon": "sparkles",
          "title": "ИИ-планировщик поездок",
          "desc": "Получите персональный маршрут по Тбилиси по дням.",
          "href": "/planner",
          "cta": "Спланировать поездку"
        }
      ]
    }
  },
```

- [ ] **Step 6: Verify JSON is valid**

Run: `python3 -c "import json; [json.load(open(f'messages/{l}.json')) for l in ['en','ka','ru']]; print('OK')"`
Expected: `OK`

- [ ] **Step 7: Add `experiencesPage` namespace to `messages/en.json`** (insert after `discoverPage`)

```json
  "experiencesPage": {
    "meta": {
      "title": "Things to Do in Tbilisi — City Tours, Boats & Activities",
      "description": "Book the best Tbilisi experiences: walking tours, wine tastings, sulphur baths, river boats, and more curated activities."
    },
    "faq": {
      "heading": "Activities FAQs",
      "sub": "What travelers ask about Tbilisi tours and activities.",
      "items": [
        {
          "q": "What is the most popular activity in Tbilisi?",
          "a": "The Old Town walking tour and Georgian wine & food tasting are the two most-booked experiences, alongside sulphur bath visits."
        },
        {
          "q": "Are there boat tours in Tbilisi?",
          "a": "Yes, short Mtkvari river boat rides are available near the Old Town and Rike Park, popular for photos of the Peace Bridge and Narikala Fortress."
        },
        {
          "q": "Do I need to book city tours in advance?",
          "a": "Popular tours and wine tastings can fill up in summer — booking 1-2 days ahead is recommended."
        }
      ]
    },
    "related": {
      "heading": "More ways to explore Tbilisi",
      "sub": "Round out your itinerary with these guides.",
      "items": [
        {
          "icon": "map-pin",
          "title": "Main Attractions",
          "desc": "The must-see sights and neighborhoods in Tbilisi.",
          "href": "/discover",
          "cta": "Explore attractions"
        },
        {
          "icon": "calendar",
          "title": "Events in Tbilisi",
          "desc": "Festivals, concerts, and what's on this month.",
          "href": "/events",
          "cta": "See what's on"
        },
        {
          "icon": "sparkles",
          "title": "AI Trip Planner",
          "desc": "Get a personalized day-by-day Tbilisi itinerary.",
          "href": "/planner",
          "cta": "Plan my trip"
        }
      ]
    }
  },
```

Add to `messages/ka.json`:
```json
  "experiencesPage": {
    "meta": {
      "title": "გასართობი აქტივობები თბილისში — ქალაქის ტურები, ნავები და აქტივობები",
      "description": "დაჯავშნეთ საუკეთესო აქტივობები თბილისში: ფეხით ტურები, ღვინის დეგუსტაციები, გოგირდის აბანოები და მდინარის ნავები."
    },
    "faq": {
      "heading": "აქტივობების ხშირად დასმული კითხვები",
      "sub": "რას ეკითხებიან მოგზაურები თბილისის ტურებზე.",
      "items": [
        {
          "q": "რომელი აქტივობაა ყველაზე პოპულარული თბილისში?",
          "a": "ძველი თბილისის ფეხით ტური და ღვინისა და საკვების დეგუსტაცია ყველაზე ხშირად ჯავშნილი აქტივობებია."
        },
        {
          "q": "არის თუ არა ნავებით სეირნობა თბილისში?",
          "a": "დიახ, მდინარე მტკვარზე მოკლე ნავით სეირნობა ხელმისაწვდომია ძველ თბილისთან და რიყის პარკთან."
        },
        {
          "q": "საჭიროა თუ არა ტურების წინასწარ დაჯავშნა?",
          "a": "პოპულარული ტურები და დეგუსტაციები ზაფხულში სწრაფად ივსება — რეკომენდირებულია 1-2 დღით ადრე დაჯავშნა."
        }
      ]
    },
    "related": {
      "heading": "მეტი გზა თბილისის შესასწავლად",
      "sub": "დაასრულეთ თქვენი მარშრუტი ამ გზამკვლევებით.",
      "items": [
        {
          "icon": "map-pin",
          "title": "მთავარი ღირსშესანიშნაობები",
          "desc": "თბილისის აუცილებელი სანახაობები და უბნები.",
          "href": "/discover",
          "cta": "აღმოაჩინეთ"
        },
        {
          "icon": "calendar",
          "title": "ღონისძიებები თბილისში",
          "desc": "ფესტივალები, კონცერტები და მიმდინარე ღონისძიებები.",
          "href": "/events",
          "cta": "იხილეთ ღონისძიებები"
        },
        {
          "icon": "sparkles",
          "title": "AI მოგზაურობის დამგეგმავი",
          "desc": "მიიღეთ პერსონალური დღიური მარშრუტი.",
          "href": "/planner",
          "cta": "დაგეგმეთ მოგზაურობა"
        }
      ]
    }
  },
```

Add to `messages/ru.json`:
```json
  "experiencesPage": {
    "meta": {
      "title": "Чем заняться в Тбилиси — городские туры, лодки и активности",
      "description": "Забронируйте лучшие впечатления в Тбилиси: пешие туры, дегустации вина, серные бани и прогулки на лодках."
    },
    "faq": {
      "heading": "Вопросы об активностях",
      "sub": "Что спрашивают путешественники о турах в Тбилиси.",
      "items": [
        {
          "q": "Какая активность самая популярная в Тбилиси?",
          "a": "Пешая экскурсия по Старому городу и дегустация грузинского вина и еды — самые бронируемые впечатления."
        },
        {
          "q": "Есть ли лодочные туры в Тбилиси?",
          "a": "Да, короткие прогулки на лодке по реке Мтквари доступны рядом со Старым городом и парком Рике."
        },
        {
          "q": "Нужно ли бронировать городские туры заранее?",
          "a": "Популярные туры и дегустации летом быстро заполняются — рекомендуется бронировать за 1-2 дня."
        }
      ]
    },
    "related": {
      "heading": "Больше способов изучить Тбилиси",
      "sub": "Дополните свой маршрут этими гидами.",
      "items": [
        {
          "icon": "map-pin",
          "title": "Главные достопримечательности",
          "desc": "Обязательные к посещению места и районы Тбилиси.",
          "href": "/discover",
          "cta": "Смотреть достопримечательности"
        },
        {
          "icon": "calendar",
          "title": "События в Тбилиси",
          "desc": "Фестивали, концерты и события этого месяца.",
          "href": "/events",
          "cta": "Смотреть события"
        },
        {
          "icon": "sparkles",
          "title": "ИИ-планировщик поездок",
          "desc": "Получите персональный маршрут по Тбилиси по дням.",
          "href": "/planner",
          "cta": "Спланировать поездку"
        }
      ]
    }
  },
```

- [ ] **Step 8: Verify JSON is valid**

Run: `python3 -c "import json; [json.load(open(f'messages/{l}.json')) for l in ['en','ka','ru']]; print('OK')"`
Expected: `OK`

- [ ] **Step 9: Add `eventsPage` namespace to `messages/en.json`** (insert after `experiencesPage`)

```json
  "eventsPage": {
    "meta": {
      "title": "Events in Tbilisi — What's On This Month",
      "description": "Upcoming festivals, concerts, and cultural events in Tbilisi, Georgia. Find out what's on during your visit."
    },
    "faq": {
      "heading": "Events FAQs",
      "sub": "Common questions about events in Tbilisi.",
      "items": [
        {
          "q": "What events happen in Tbilisi in summer?",
          "a": "Tbilisi Open Air and the Georgian Wine Festival are the two biggest summer events, both drawing large local and international crowds."
        },
        {
          "q": "Where can I find live music in Tbilisi?",
          "a": "Fabrika, Mtkvari riverbank venues, and dedicated festival grounds host most of the city's live music events throughout the year."
        },
        {
          "q": "Do Tbilisi festivals sell out?",
          "a": "Major festivals like Tbilisi Open Air can sell out — buying tickets in advance online is recommended."
        }
      ]
    },
    "related": {
      "heading": "Plan around the event",
      "sub": "Guides to fill out the rest of your trip.",
      "items": [
        {
          "icon": "compass",
          "title": "Things to Do",
          "desc": "City tours, wine tastings, and unique experiences.",
          "href": "/experiences",
          "cta": "See experiences"
        },
        {
          "icon": "utensils",
          "title": "Food & Wine",
          "desc": "Best restaurants and nightlife in Tbilisi.",
          "href": "/food",
          "cta": "See where to eat"
        },
        {
          "icon": "info",
          "title": "Travel Guide",
          "desc": "Transport, safety, and first-time visitor essentials.",
          "href": "/travel-info",
          "cta": "Read the guide"
        }
      ]
    }
  },
```

Add to `messages/ka.json`:
```json
  "eventsPage": {
    "meta": {
      "title": "ღონისძიებები თბილისში — რა ხდება ამ თვეში",
      "description": "მომავალი ფესტივალები, კონცერტები და კულტურული ღონისძიებები თბილისში."
    },
    "faq": {
      "heading": "ღონისძიებების ხშირად დასმული კითხვები",
      "sub": "ხშირი კითხვები თბილისის ღონისძიებების შესახებ.",
      "items": [
        {
          "q": "რა ღონისძიებები ტარდება თბილისში ზაფხულში?",
          "a": "Tbilisi Open Air და ქართული ღვინის ფესტივალი ზაფხულის ორი უმსხვილესი ღონისძიებაა."
        },
        {
          "q": "სად შემიძლია ცოცხალი მუსიკის მოსმენა თბილისში?",
          "a": "ფაბრიკა, მტკვრის სანაპირო და ფესტივალის სივრცეები მასპინძლობენ ცოცხალი მუსიკის ღონისძიებების უმეტესობას."
        },
        {
          "q": "იყიდება თუ არა თბილისის ფესტივალების ბილეთები?",
          "a": "მსხვილი ფესტივალები, როგორიც არის Tbilisi Open Air, შეიძლება გაიყიდოს — რეკომენდირებულია წინასწარ ონლაინ ყიდვა."
        }
      ]
    },
    "related": {
      "heading": "დაგეგმეთ ღონისძიების ირგვლივ",
      "sub": "გზამკვლევები თქვენი მოგზაურობის დასრულებისთვის.",
      "items": [
        {
          "icon": "compass",
          "title": "გასართობი აქტივობები",
          "desc": "ქალაქის ტურები, ღვინის დეგუსტაციები და უნიკალური გამოცდილებები.",
          "href": "/experiences",
          "cta": "იხილეთ აქტივობები"
        },
        {
          "icon": "utensils",
          "title": "საკვები და ღვინო",
          "desc": "საუკეთესო რესტორნები და ღამის ცხოვრება თბილისში.",
          "href": "/food",
          "cta": "იხილეთ სად ჭამოთ"
        },
        {
          "icon": "info",
          "title": "სამოგზაურო გზამკვლევი",
          "desc": "ტრანსპორტი, უსაფრთხოება და პირველად ჩამოსულთათვის საჭირო ინფორმაცია.",
          "href": "/travel-info",
          "cta": "წაიკითხეთ გზამკვლევი"
        }
      ]
    }
  },
```

Add to `messages/ru.json`:
```json
  "eventsPage": {
    "meta": {
      "title": "События в Тбилиси — что происходит в этом месяце",
      "description": "Предстоящие фестивали, концерты и культурные события в Тбилиси, Грузия."
    },
    "faq": {
      "heading": "Вопросы о событиях",
      "sub": "Частые вопросы о событиях в Тбилиси.",
      "items": [
        {
          "q": "Какие события проходят в Тбилиси летом?",
          "a": "Tbilisi Open Air и Фестиваль грузинского вина — два крупнейших летних события."
        },
        {
          "q": "Где послушать живую музыку в Тбилиси?",
          "a": "Фабрика, набережная Мтквари и фестивальные площадки принимают большинство концертов живой музыки в течение года."
        },
        {
          "q": "Распродаются ли билеты на фестивали в Тбилиси?",
          "a": "Крупные фестивали, такие как Tbilisi Open Air, могут распродаваться — рекомендуется покупать билеты заранее онлайн."
        }
      ]
    },
    "related": {
      "heading": "Спланируйте вокруг события",
      "sub": "Гиды, чтобы дополнить остальную часть поездки.",
      "items": [
        {
          "icon": "compass",
          "title": "Чем заняться",
          "desc": "Городские туры, дегустации вин и уникальные впечатления.",
          "href": "/experiences",
          "cta": "Смотреть активности"
        },
        {
          "icon": "utensils",
          "title": "Еда и вино",
          "desc": "Лучшие рестораны и ночная жизнь Тбилиси.",
          "href": "/food",
          "cta": "Где поесть"
        },
        {
          "icon": "info",
          "title": "Путеводитель",
          "desc": "Транспорт, безопасность и основы для тех, кто впервые приезжает.",
          "href": "/travel-info",
          "cta": "Читать гид"
        }
      ]
    }
  },
```

- [ ] **Step 10: Verify JSON is valid**

Run: `python3 -c "import json; [json.load(open(f'messages/{l}.json')) for l in ['en','ka','ru']]; print('OK')"`
Expected: `OK`

- [ ] **Step 11: Commit**

```bash
git add messages/en.json messages/ka.json messages/ru.json
git commit -m "feat(seo): add SEO copy, FAQ, and related-guides translations"
```

---

### Task 5: Root layout metadataBase + alternates

**Files:**
- Modify: `src/app/[locale]/layout.tsx:41-55`

**Interfaces:**
- Consumes: `SITE_URL` from `src/lib/seo.ts` (Task 1); `routing.locales` from `src/i18n/routing.ts`.

- [ ] **Step 1: Update `generateMetadata` in `src/app/[locale]/layout.tsx`**

Replace:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s · ${t("name")}`,
    },
    description: t("tagline"),
  };
}
```
with:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t("name")} — ${t("tagline")}`,
      template: `%s · ${t("name")}`,
    },
    description: t("tagline"),
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages,
    },
  };
}
```

Add the import at the top of the file (alongside the existing imports):
```ts
import { SITE_URL } from "@/lib/seo";
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/layout.tsx
git commit -m "feat(seo): add metadataBase and root canonical/hreflang alternates"
```

---

### Task 6: Home page metadata + WebSite/Organization schema

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `@/lib/seo`; `JsonLd` from `@/components/site/json-ld`; `homePage.meta.{title,description}` translation namespace (Task 4).

- [ ] **Step 1: Add `generateMetadata` and JSON-LD to `src/app/[locale]/page.tsx`**

Replace the top of the file:
```tsx
import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/site/home/hero-section";
import { StatsBar } from "@/components/site/home/stats-bar";
import { CategoriesStrip } from "@/components/site/home/categories-strip";
import { FeaturedPlaces } from "@/components/site/home/featured-places";
import { NeighborhoodsSection } from "@/components/site/home/neighborhoods-section";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";
import { ListBusinessSection } from "@/components/site/home/list-business-section";
import { mockPlaces } from "@/lib/mock/places";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const featuredPlaces = mockPlaces.slice(0, 4);

  return (
    <div style={{ background: "var(--site-bg-base)" }}>
      <HeroSection />
```
with:
```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/site/home/hero-section";
import { StatsBar } from "@/components/site/home/stats-bar";
import { CategoriesStrip } from "@/components/site/home/categories-strip";
import { FeaturedPlaces } from "@/components/site/home/featured-places";
import { NeighborhoodsSection } from "@/components/site/home/neighborhoods-section";
import { AIPlannerCTA } from "@/components/site/home/ai-planner-cta";
import { ListBusinessSection } from "@/components/site/home/list-business-section";
import { mockPlaces } from "@/lib/mock/places";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "homePage.meta" });
  return buildMetadata({
    locale,
    path: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const featuredPlaces = mockPlaces.slice(0, 4);

  return (
    <div style={{ background: "var(--site-bg-base)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ExploreTbilisi",
          url: `${SITE_URL}/${locale}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ExploreTbilisi",
          url: `${SITE_URL}/${locale}`,
        }}
      />
      <HeroSection />
```

- [ ] **Step 2: Build and visual check**

Run: `npm run dev`
Visit `http://localhost:3000/en`, view source, confirm `<title>Tbilisi Travel Guide & AI Trip Planner · ExploreTbilisi</title>`, a `<meta name="description">`, `<link rel="canonical">`, and two `<script type="application/ld+json">` blocks are present.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "feat(seo): add home page metadata and WebSite/Organization schema"
```

---

### Task 7: Food page metadata, schema, FAQ, related guides

**Files:**
- Modify: `src/app/[locale]/food/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata`, `JsonLd`, `FaqBlock`, `RelatedGuides`, `foodPage.meta`/`faq`/`related` namespaces.

- [ ] **Step 1: Add `generateMetadata`, JSON-LD, and new sections**

At the top of `src/app/[locale]/food/page.tsx`, add imports:
```ts
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { FaqBlock } from "@/components/site/faq-block";
import { RelatedGuides } from "@/components/site/related-guides";
```

Add `generateMetadata` before the `FoodPage` component:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "foodPage.meta" });
  return buildMetadata({
    locale,
    path: "/food",
    title: t("title"),
    description: t("description"),
  });
}
```

Inside `FoodPage`, right after `setRequestLocale(locale);`, add the JSON-LD (uses the existing `PLACES` const already defined in the file):
```tsx
  const restaurantSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: PLACES.map((place, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": place.type === "cafe" ? "CafeOrCoffeeShop" : "Restaurant",
        name: place.name,
        servesCuisine: place.cuisine,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: place.rating,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: place.area,
          addressCountry: "GE",
        },
      },
    })),
  };
```

Add `<JsonLd data={restaurantSchema} />` as the first child inside the outer `<div style={{ background: "#0A0A0A", minHeight: "100vh" }}>`.

At the end of the JSX, right before the closing `</div>` of that same outer div (after the "Grid" section, replacing the final two lines):
```tsx
      <FaqBlock namespace="foodPage.faq" />
      <RelatedGuides namespace="foodPage.related" />
    </div>
  );
}
```

- [ ] **Step 2: Build and visual check**

Run: `npm run dev`
Visit `http://localhost:3000/en/food`, view source for `<title>`/`<meta description>`/JSON-LD `ItemList`, and visually confirm the FAQ accordion and related-guides cards render below the restaurant grid.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/food/page.tsx"
git commit -m "feat(seo): add food page metadata, schema, FAQ, and related guides"
```

---

### Task 8: Discover, Experiences, Events pages — metadata, schema, FAQ, related guides

**Files:**
- Modify: `src/app/[locale]/discover/page.tsx`
- Modify: `src/app/[locale]/experiences/page.tsx`
- Modify: `src/app/[locale]/events/page.tsx`

**Interfaces:**
- Consumes: same as Task 7, but with `discoverPage`/`experiencesPage`/`eventsPage` namespaces and each page's own existing data const (`mockPlaces`/`mockCategories` for discover — no local array; `EXPERIENCES` for experiences; `EVENTS` for events).

- [ ] **Step 1: Discover page — add metadata (no per-item schema; discover pulls from `mockPlaces`, already schema-eligible via `/places/[slug]` in Task 10, so keep this page's schema to a lightweight `CollectionPage` type)**

Add imports to `src/app/[locale]/discover/page.tsx`:
```ts
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
import { FaqBlock } from "@/components/site/faq-block";
import { RelatedGuides } from "@/components/site/related-guides";
```

Add before `DiscoverPage`:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "discoverPage.meta" });
  return buildMetadata({
    locale,
    path: "/discover",
    title: t("title"),
    description: t("description"),
  });
}
```

Inside the component, right after `setRequestLocale(locale);`:
```tsx
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tbilisi Attractions",
    url: "https://exploretbilisi.online/en/discover",
  };
```

Add `<JsonLd data={collectionSchema} />` as the first child of the page's outer `<div>`, and add `<FaqBlock namespace="discoverPage.faq" />` and `<RelatedGuides namespace="discoverPage.related" />` right before that outer div's closing tag.

- [ ] **Step 2: Experiences page — add metadata + ItemList schema**

Add the same four imports to `src/app/[locale]/experiences/page.tsx`, plus `generateMetadata` (path `/experiences`, namespace `experiencesPage.meta`).

Inside the component, after `setRequestLocale(locale);`, build schema from the existing `EXPERIENCES` const:
```tsx
  const experiencesSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: EXPERIENCES.map((exp, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristAttraction",
        name: exp.title,
        description: exp.desc,
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: exp.rating,
          reviewCount: exp.reviews,
        },
      },
    })),
  };
```

Add `<JsonLd data={experiencesSchema} />` as the first child of the outer container, and `<FaqBlock namespace="experiencesPage.faq" />` + `<RelatedGuides namespace="experiencesPage.related" />` before its closing tag.

- [ ] **Step 3: Events page — add metadata + Event schema**

Add the same four imports to `src/app/[locale]/events/page.tsx`, plus `generateMetadata` (path `/events`, namespace `eventsPage.meta`).

Inside the component, after `setRequestLocale(locale);`, build schema from the existing `EVENTS` const:
```tsx
  const eventsSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: EVENTS.map((evt, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: evt.title,
        description: evt.desc,
        location: {
          "@type": "Place",
          name: evt.location,
        },
      },
    })),
  };
```

Add `<JsonLd data={eventsSchema} />` as the first child of the outer container, and `<FaqBlock namespace="eventsPage.faq" />` + `<RelatedGuides namespace="eventsPage.related" />` before its closing tag.

- [ ] **Step 4: Build and visual check for all three pages**

Run: `npm run dev`
Visit `/en/discover`, `/en/experiences`, `/en/events` — view source for correct `<title>`/`<meta description>`/JSON-LD, and visually confirm FAQ + related-guides sections render at the bottom of each page.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/discover/page.tsx" "src/app/[locale]/experiences/page.tsx" "src/app/[locale]/events/page.tsx"
git commit -m "feat(seo): add metadata, schema, FAQ, and related guides to discover/experiences/events pages"
```

---

### Task 9: Travel-info page — FAQPage schema

**Files:**
- Modify: `src/app/[locale]/travel-info/page.tsx`

**Interfaces:**
- Consumes: `JsonLd` from `@/components/site/json-ld`; existing `travelInfoPage.faq.items` translation content (already present, read server-side via `getTranslations`, `.raw("items")`).

- [ ] **Step 1: Add `FAQPage` JSON-LD**

Add import to `src/app/[locale]/travel-info/page.tsx`:
```ts
import { JsonLd } from "@/components/site/json-ld";
```

In `generateMetadata`, extend the existing namespace fetch to also read the FAQ items (already exists in translations, this just wires it into schema). Replace:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "travelInfoPage.meta",
  });
  return { title: t("title"), description: t("description") };
}
```
with:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "travelInfoPage.meta",
  });
  return buildMetadata({
    locale,
    path: "/travel-info",
    title: t("title"),
    description: t("description"),
  });
}
```

Add the `buildMetadata` import alongside the `Metadata` import:
```ts
import { buildMetadata } from "@/lib/seo";
```

In the `TravelInfoPage` component, after `setRequestLocale(locale);`, fetch the FAQ items server-side and render the schema:
```tsx
  const tFaq = await getTranslations({ locale, namespace: "travelInfoPage.faq" });
  const faqItems = (tFaq.raw("items") ?? []) as { q: string; a: string }[];
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
```

Add `<JsonLd data={faqSchema} />` as the first child inside the `<main style={{ background: "var(--site-bg-base)" }}>` element.

- [ ] **Step 2: Build and visual check**

Run: `npm run dev`
Visit `http://localhost:3000/en/travel-info`, view source, confirm `<link rel="canonical">` and a `<script type="application/ld+json">` `FAQPage` block matching the visible FAQ accordion content.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/travel-info/page.tsx"
git commit -m "feat(seo): add canonical/hreflang and FAQPage schema to travel-info page"
```

---

### Task 10: Cities list, city detail, place detail — metadata + schema

**Files:**
- Modify: `src/app/[locale]/cities/page.tsx`
- Modify: `src/app/[locale]/cities/[slug]/page.tsx`
- Modify: `src/app/[locale]/places/[slug]/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata`, `JsonLd`; existing `City`/`Place` DB models already queried in these pages; `cities.title`/`cities.subtitle` translation keys (already exist).

- [ ] **Step 1: Cities list page — add `generateMetadata`**

`src/app/[locale]/cities/page.tsx` currently starts:
```tsx
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CityCard } from "@/components/site/city-card";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import type { City } from "@/types";

export default async function CitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
```

Replace those lines with:
```tsx
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CityCard } from "@/components/site/city-card";
import { connectDB } from "@/lib/db";
import { CityModel } from "@/lib/models/city";
import { buildMetadata } from "@/lib/seo";
import type { City } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cities" });
  return buildMetadata({
    locale,
    path: "/cities",
    title: `${t("title")} — Georgia Travel Guide`,
    description: t("subtitle"),
  });
}

export default async function CitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
```

The rest of the file (`CitiesPage` body and `CitiesContent`) is unchanged.

- [ ] **Step 2: City detail page — add `generateMetadata` + `TouristDestination` schema**

Add imports to `src/app/[locale]/cities/[slug]/page.tsx`:
```ts
import type { Metadata } from "next";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
```

Add `generateMetadata` before the default export (reuses the same DB query pattern already in the file):
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  await connectDB();
  const city = (await CityModel.findOne({ slug }).lean()) as unknown as City | null;
  if (!city) return {};
  const name = locale === "ka" ? city.nameKa : city.name;
  const description = locale === "ka" ? city.descriptionKa : city.description;
  return buildMetadata({
    locale,
    path: `/cities/${slug}`,
    title: `Things to Do in ${name} — Attractions & Travel Guide`,
    description,
  });
}
```

In the default-exported `CityPage` function, pass the JSON-LD data down to `CityContent` (or inline it there — simplest is to add it directly inside `CityContent`, which already has `city` in scope). Modify `CityContent`:
```tsx
function CityContent({ city, places }: { city: City; places: Place[] }) {
  const t = useTranslations("city");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const name = locale === "ka" ? city.nameKa : city.name;
  const description = locale === "ka" ? city.descriptionKa : city.description;
  const citySchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name,
    description,
    url: `${SITE_URL}/${locale}/cities/${city.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.geo.lat,
      longitude: city.geo.lng,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: city.geo.address,
      addressCountry: city.country,
    },
  };

  return (
    <>
      <JsonLd data={citySchema} />
      <section className="relative h-[40vh] min-h-72 w-full overflow-hidden">
```
(`SITE_URL` needs `locale` in scope — already available via `useLocale()` above, matches existing code.)

- [ ] **Step 3: Place detail page — add `generateMetadata` + `TouristAttraction` schema**

Add imports to `src/app/[locale]/places/[slug]/page.tsx`:
```ts
import type { Metadata } from "next";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/site/json-ld";
```

Add `generateMetadata` before the default export:
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  await connectDB();
  const placeDoc = await PlaceModel.findOne({ slug }).lean();
  if (!placeDoc) return {};
  const place = serializePlace(placeDoc);
  const name = locale === "ka" ? place.nameKa : place.name;
  const description = locale === "ka" ? place.descriptionKa : place.description;
  return buildMetadata({
    locale,
    path: `/places/${slug}`,
    title: `${name} — ${place.citySlug} Travel Guide`,
    description,
    image: place.images?.[0],
  });
}
```

In `PlaceContent`, after the existing `const dayNames = ...` line, add:
```tsx
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description,
    url: `${SITE_URL}/${locale}/places/${place.slug}`,
    image: place.images,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.geo.address,
    },
    aggregateRating:
      place.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: place.rating,
            reviewCount: place.reviewCount,
          }
        : undefined,
  };
```

Add `<JsonLd data={placeSchema} />` as the first child of the returned `<article ...>` element.

- [ ] **Step 4: Build check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npm run dev`
Visit `/en/cities`, a seeded city (e.g. `/en/cities/tbilisi` — confirm exact slug from `npx tsx --env-file=.env.local scripts/seed.ts` output or DB if unsure), and a seeded place URL. View source for correct titles, canonical links, and JSON-LD (`TouristDestination` / `TouristAttraction`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/cities/page.tsx" "src/app/[locale]/cities/[slug]/page.tsx" "src/app/[locale]/places/[slug]/page.tsx"
git commit -m "feat(seo): add metadata and schema to cities and places pages"
```

---

### Task 11: Map and Planner pages — metadata

**Files:**
- Modify: `src/app/[locale]/map/page.tsx`
- Modify: `src/app/[locale]/planner/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `@/lib/seo`.

- [ ] **Step 1: Add `generateMetadata` to `src/app/[locale]/map/page.tsx`**

The file currently starts:
```tsx
import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { MapExplorer } from "@/components/map/map-explorer";
import type { Place } from "@/types";

export default async function MapPage({
```

Replace those lines with:
```tsx
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";
import { MapExplorer } from "@/components/map/map-explorer";
import { buildMetadata } from "@/lib/seo";
import type { Place } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    path: "/map",
    title: "Tbilisi Map — Explore Attractions & Plan Your Route",
    description:
      "Interactive map of Tbilisi's top attractions, restaurants, and neighborhoods. Find places near you and plan your route.",
  });
}

export default async function MapPage({
```

The rest of the file is unchanged.

- [ ] **Step 2: Update `generateMetadata` in `src/app/[locale]/planner/page.tsx`**

The file already has a `generateMetadata` (title only, no description/canonical). Current content:
```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PlannerView } from "@/components/planner/planner-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "planner" });
  return { title: t("title") };
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlannerView />;
}
```

Replace the whole file with:
```tsx
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PlannerView } from "@/components/planner/planner-view";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "planner" });
  return buildMetadata({
    locale,
    path: "/planner",
    title: t("title"),
    description:
      "Build a personalized Tbilisi itinerary in minutes with our free AI trip planner. Tell it your travel style and get a day-by-day plan.",
  });
}

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlannerView />;
}
```

- [ ] **Step 3: Build check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npm run dev`
Visit `/en/map` and `/en/planner`, view source, confirm titles/descriptions/canonical links.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/map/page.tsx" "src/app/[locale]/planner/page.tsx"
git commit -m "feat(seo): add metadata to map and planner pages"
```

---

### Task 12: Full site build verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build succeeds with no type errors; `/sitemap.xml` and `/robots.txt` appear in the route list output.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new lint errors introduced by this work.

- [ ] **Step 3: Manual smoke test across locales**

Run: `npm run start` (after build), then visit and view-source on each of: `/en`, `/ka`, `/ru`, `/en/food`, `/en/discover`, `/en/experiences`, `/en/events`, `/en/travel-info`, `/en/cities`, a city detail page, a place detail page, `/en/map`, `/en/planner`.
Expected for each: unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, three `<link rel="alternate" hreflang="...">` tags (en/ka/ru), and at least one `<script type="application/ld+json">` where specified above. No console errors about missing translation keys.

- [ ] **Step 4: Sitemap/robots final check**

Visit `/sitemap.xml` — confirm it includes every static path × 3 locales plus DB-backed city/place slugs, each with 3 hreflang alternates. Visit `/robots.txt` — confirm disallowed paths and sitemap URL are correct.

- [ ] **Step 5: Final commit (only if any fixes were needed in this task)**

```bash
git add -A
git commit -m "fix(seo): address build/lint issues found in verification pass"
```
(Skip this step entirely if Steps 1-4 pass with no changes needed.)

---

## Self-Review Notes

- **Spec coverage:** sitemap.ts/robots.ts (Task 2), metadataBase+hreflang (Task 5), per-page metadata for all 10 in-scope pages (Tasks 6-11), JSON-LD for WebSite/Organization/Restaurant/TouristAttraction/TouristDestination/Event/FAQPage/CollectionPage (Tasks 6-10), internal linking via RelatedGuides (Tasks 7-8), long-tail FAQ content (Tasks 4, 7-9) — all spec sections have a corresponding task.
- **Type consistency:** `buildMetadata`, `JsonLd`, `FaqBlock`, `RelatedGuides` signatures defined once in Tasks 1 and 3, referenced identically in every later task.
- **Follow-up items** (shopping, day trips, where to stay, dedicated best-time-to-visit page) are intentionally not tasked here — they're listed in the spec's "Follow-up recommendations" section as future work, not silently dropped.
