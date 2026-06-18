"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NavLink = { label: string; href: string };
type FooterColumn = { heading: string; links: NavLink[] };
type SocialLink = { platform: string; url: string };
type PageConfig = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  showCategories: boolean;
  showFeaturedPlaces: boolean;
  componentOrder: string[];
};

type Config = {
  header: { logoText: string; logoImageUrl: string; navLinks: NavLink[] };
  footer: {
    copyrightText: string;
    columns: FooterColumn[];
    socialLinks: SocialLink[];
  };
  pages: Record<string, PageConfig>;
};

const PAGE_SLUGS = ["home", "planner", "places", "cities", "tickets"];
const DEFAULT_PAGE: PageConfig = {
  heroTitle: "",
  heroSubtitle: "",
  heroImageUrl: "",
  showCategories: true,
  showFeaturedPlaces: true,
  componentOrder: ["hero", "stats", "categories", "featured", "cta"],
};

type TabKey = "header" | "footer" | "pages";

export function CmsEditor({ initial }: { initial: Config }) {
  const [config, setConfig] = useState<Config>(initial);
  const [tab, setTab] = useState<TabKey>("header");
  const [pageSlug, setPageSlug] = useState("home");
  const [saving, setSaving] = useState(false);

  const page: PageConfig = config.pages[pageSlug] ?? DEFAULT_PAGE;

  function setPage(patch: Partial<PageConfig>) {
    setConfig((c) => ({
      ...c,
      pages: {
        ...c.pages,
        [pageSlug]: { ...(c.pages[pageSlug] ?? DEFAULT_PAGE), ...patch },
      },
    }));
  }

  function addNavLink() {
    setConfig((c) => ({
      ...c,
      header: {
        ...c.header,
        navLinks: [...c.header.navLinks, { label: "", href: "/" }],
      },
    }));
  }

  function removeNavLink(i: number) {
    setConfig((c) => ({
      ...c,
      header: {
        ...c.header,
        navLinks: c.header.navLinks.filter((_, idx) => idx !== i),
      },
    }));
  }

  function updateNavLink(i: number, field: keyof NavLink, value: string) {
    setConfig((c) => {
      const links = [...c.header.navLinks];
      links[i] = { ...links[i], [field]: value };
      return { ...c, header: { ...c.header, navLinks: links } };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Site config saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "header", label: "Header" },
    { key: "footer", label: "Footer" },
    { key: "pages", label: "Pages" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header tab */}
      {tab === "header" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Logo Text</Label>
              <Input
                value={config.header.logoText}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    header: { ...c.header, logoText: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Logo Image URL</Label>
              <Input
                value={config.header.logoImageUrl}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    header: { ...c.header, logoImageUrl: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Navigation Links</Label>
              <Button size="sm" variant="outline" onClick={addNavLink}>
                <Plus className="size-3.5 mr-1" /> Add link
              </Button>
            </div>
            {config.header.navLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No nav links yet.</p>
            )}
            {config.header.navLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updateNavLink(i, "label", e.target.value)}
                  placeholder="Label"
                />
                <Input
                  value={link.href}
                  onChange={(e) => updateNavLink(i, "href", e.target.value)}
                  placeholder="/path"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeNavLink(i)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer tab */}
      {tab === "footer" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Copyright Text</Label>
            <Input
              value={config.footer.copyrightText}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  footer: { ...c.footer, copyrightText: e.target.value },
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Social Links</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    footer: {
                      ...c.footer,
                      socialLinks: [
                        ...c.footer.socialLinks,
                        { platform: "", url: "" },
                      ],
                    },
                  }))
                }
              >
                <Plus className="size-3.5 mr-1" /> Add
              </Button>
            </div>
            {config.footer.socialLinks.map((sl, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={sl.platform}
                  onChange={(e) => {
                    const links = [...config.footer.socialLinks];
                    links[i] = { ...links[i], platform: e.target.value };
                    setConfig((c) => ({
                      ...c,
                      footer: { ...c.footer, socialLinks: links },
                    }));
                  }}
                  placeholder="Platform (twitter, instagram…)"
                />
                <Input
                  value={sl.url}
                  onChange={(e) => {
                    const links = [...config.footer.socialLinks];
                    links[i] = { ...links[i], url: e.target.value };
                    setConfig((c) => ({
                      ...c,
                      footer: { ...c.footer, socialLinks: links },
                    }));
                  }}
                  placeholder="https://..."
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      footer: {
                        ...c.footer,
                        socialLinks: c.footer.socialLinks.filter(
                          (_, idx) => idx !== i
                        ),
                      },
                    }))
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pages tab */}
      {tab === "pages" && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label>Page</Label>
            <select
              value={pageSlug}
              onChange={(e) => setPageSlug(e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SLUGS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Hero Title</Label>
              <Input
                value={page.heroTitle}
                onChange={(e) => setPage({ heroTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hero Subtitle</Label>
              <Input
                value={page.heroSubtitle}
                onChange={(e) => setPage({ heroSubtitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hero Image URL</Label>
              <Input
                value={page.heroImageUrl}
                onChange={(e) => setPage({ heroImageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={page.showCategories}
                  onChange={(e) =>
                    setPage({ showCategories: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Show Categories Strip
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={page.showFeaturedPlaces}
                  onChange={(e) =>
                    setPage({ showFeaturedPlaces: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Show Featured Places
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Component Order (comma-separated)</Label>
              <Input
                value={page.componentOrder.join(", ")}
                onChange={(e) =>
                  setPage({
                    componentOrder: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="hero, stats, categories, featured, cta"
              />
            </div>
          </div>
        </div>
      )}

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Config"}
      </Button>
    </div>
  );
}
