"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FieldDescriptor = {
  name: string;
  type: string;
  required: boolean;
  enumValues?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  collection: string;
  fields: FieldDescriptor[];
  doc: Record<string, unknown> | null;
  onSaved: () => void;
};

const SKIP_FIELDS = new Set([
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "password",
]);

export function CrudModal({
  open,
  onClose,
  collection,
  fields,
  doc,
  onSaved,
}: Props) {
  const isEdit = !!doc;
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (doc) {
      const init: Record<string, string> = {};
      for (const [k, v] of Object.entries(doc)) {
        if (!SKIP_FIELDS.has(k)) {
          init[k] = Array.isArray(v)
            ? (v as unknown[]).join(", ")
            : String(v ?? "");
        }
      }
      setValues(init);
    } else {
      setValues({});
    }
    setError("");
  }, [doc, open]);

  const editableFields = fields.filter((f) => !SKIP_FIELDS.has(f.name));

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      for (const f of editableFields) {
        const v = values[f.name] ?? "";
        if (!v && !f.required) continue;
        if (f.type === "Number") body[f.name] = Number(v);
        else if (f.type === "Boolean") body[f.name] = v === "true";
        else if (f.type === "Date")
          body[f.name] = v ? new Date(v).toISOString() : undefined;
        else if (f.type === "Array")
          body[f.name] = v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        else body[f.name] = v;
      }

      const url = isEdit
        ? `/api/admin/collections/${collection}/${(doc as { _id: string })._id}`
        : `/api/admin/collections/${collection}`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving document");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit" : "Create"} — {collection}
          </h2>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {editableFields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No editable fields found.
            </p>
          )}
          {editableFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label>
                {f.name}
                {f.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({f.type})
                </span>
              </Label>

              {f.enumValues && f.enumValues.length > 0 ? (
                <select
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">— select —</option>
                  {f.enumValues.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : f.type === "Boolean" ? (
                <select
                  value={values[f.name] ?? "false"}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <Input
                  type={
                    f.type === "Number"
                      ? "number"
                      : f.type === "Date"
                        ? "date"
                        : "text"
                  }
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  placeholder={
                    f.type === "Array" ? "comma, separated, values" : undefined
                  }
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
