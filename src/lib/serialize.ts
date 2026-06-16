import type { Place } from "@/types";

/**
 * Convert a Mongoose lean/raw document into a plain, client-serializable object.
 * Strips `_id` buffers, `__v`, and turns nested `_id`s into string `id`s.
 * Necessary before passing data from a Server Component to a Client Component.
 */
export function serializeDoc<T = Record<string, unknown>>(doc: unknown): T {
  return JSON.parse(JSON.stringify(toPlain(doc))) as T;
}

function toPlain(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(toPlain);

  const obj = value as Record<string, unknown>;
  // Mongo ObjectId / Buffer → string
  if (typeof (obj as { toHexString?: () => string }).toHexString === "function") {
    return (obj as { toHexString: () => string }).toHexString();
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__v") continue;
    if (k === "_id") {
      out.id = String(v as { toString(): string });
      continue;
    }
    out[k] = toPlain(v);
  }
  return out;
}

/** Serialize a place doc, normalizing `_id` → `id` on the place and its services. */
export function serializePlace(doc: unknown): Place {
  return serializeDoc<Place>(doc);
}
