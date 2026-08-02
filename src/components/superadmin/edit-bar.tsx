"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FileText, Palette, PencilLine, Settings2, X, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEditTarget } from "./edit-target";

const BAR_OPEN_KEY = "superadmin-bar-open";

// External store for the bar's open/closed state, backed by localStorage.
// useSyncExternalStore lets the server snapshot (always `false`) and the
// first client snapshot agree by construction, avoiding a hydration
// mismatch, while still allowing same-tab writes (via the "bar-open" local
// pub/sub) and cross-tab writes (via the native "storage" event) to trigger
// a re-render without ever calling setState in an effect body. See
// src/components/superadmin/sidebar.tsx for the pattern this mirrors.
const barOpenListeners = new Set<() => void>();

function subscribeToBarOpen(onStoreChange: () => void) {
  barOpenListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    barOpenListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getBarOpenSnapshot() {
  return localStorage.getItem(BAR_OPEN_KEY) === "true";
}

function getBarOpenServerSnapshot() {
  return false;
}

function setBarOpen(value: boolean) {
  localStorage.setItem(BAR_OPEN_KEY, String(value));
  for (const listener of barOpenListeners) listener();
}

export function SuperadminEditBar() {
  const { data: session } = useSession();
  const t = useTranslations("superadminBar");
  const target = useEditTarget();
  const open = useSyncExternalStore(subscribeToBarOpen, getBarOpenSnapshot, getBarOpenServerSnapshot);

  const toggle = useCallback(() => {
    setBarOpen(!getBarOpenSnapshot());
  }, []);

  if ((session?.user as { role?: string } | undefined)?.role !== "superadmin") return null;

  const items = [
    ...(target ? [{ href: target.href, label: target.label ?? t("editListing"), Icon: PencilLine }] : []),
    { href: "/superadmin/cms", label: t("pageContent"), Icon: FileText },
    { href: "/superadmin/theme", label: t("theme"), Icon: Palette },
    { href: "/superadmin", label: t("panel"), Icon: Settings2 },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div className="w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="size-3.5" /> {t("title")}
            </span>
            <button onClick={toggle} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="p-1">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!open && (
        <button
          onClick={toggle}
          aria-label={t("title")}
          title={t("title")}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:text-foreground"
        >
          <Zap className="size-4" />
        </button>
      )}
    </div>
  );
}
