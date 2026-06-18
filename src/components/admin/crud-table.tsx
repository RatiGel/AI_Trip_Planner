"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CrudModal, type FieldDescriptor } from "./crud-modal";

type Doc = Record<string, unknown>;

export function CrudTable({ collection }: { collection: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [fields, setFields] = useState<FieldDescriptor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/collections/${collection}?page=${page}&filter=${encodeURIComponent(filter)}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(data.docs ?? []);
      setFields(data.fields ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [collection, page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when collection changes
  useEffect(() => {
    setPage(1);
    setFilter("");
    setDeleteTarget(null);
  }, [collection]);

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/collections/${collection}/${id}`, {
        method: "DELETE",
      });
      toast.success("Document deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
    setDeleteTarget(null);
  }

  const totalPages = Math.ceil(total / 25);
  const displayFields = fields
    .filter((f) => !["__v", "password"].includes(f.name))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by name, email or slug…"
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditDoc(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4 mr-1.5" /> New
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {displayFields.map((f) => (
                <TableHead key={f.name} className="text-xs">
                  {f.name}
                </TableHead>
              ))}
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="text-center text-muted-foreground py-10"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="text-center text-muted-foreground py-10"
                >
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => (
                <TableRow key={String(doc._id)}>
                  {displayFields.map((f) => (
                    <TableCell
                      key={f.name}
                      className="max-w-[180px] truncate text-sm"
                    >
                      {Array.isArray(doc[f.name])
                        ? (doc[f.name] as unknown[]).slice(0, 2).join(", ")
                        : String(doc[f.name] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditDoc(doc);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {deleteTarget === String(doc._id) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(String(doc._id))}
                        >
                          Confirm
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(String(doc._id))}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {Math.min((page - 1) * 25 + 1, total)}–{Math.min(page * 25, total)}{" "}
            of {total}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <CrudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        collection={collection}
        fields={fields}
        doc={editDoc}
        onSaved={load}
      />
    </div>
  );
}
