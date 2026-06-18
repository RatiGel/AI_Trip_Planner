"use client";

import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { CrudTable } from "@/components/admin/crud-table";

export default function DatabasePage() {
  const [collections, setCollections] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((names: string[]) => {
        setCollections(names);
        if (names.length) setSelected(names[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Database className="size-7" /> Database
        </h1>
        <p className="text-muted-foreground">
          Browse and manage all MongoDB collections directly.
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-44 shrink-0">
          <div className="rounded-2xl border border-border bg-card p-2 space-y-0.5">
            <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Collections
            </p>
            {loading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Loading…
              </p>
            ) : (
              collections.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelected(c)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selected === c
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <h2 className="mb-4 text-xl font-semibold">{selected}</h2>
              <CrudTable collection={selected} />
            </>
          ) : (
            <p className="text-muted-foreground">
              Select a collection to browse.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
