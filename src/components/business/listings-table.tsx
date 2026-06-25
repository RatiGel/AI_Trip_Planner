"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PayButton } from "@/components/site/pay-button";

interface Listing {
  id: string;
  name: string;
  slug: string;
  status: string;
  viewCount: number;
  rating: number;
  reviewCount: number;
  citySlug: string;
  paid: boolean;
  rejectionReason?: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  approved: "secondary",
  pending: "secondary",
  draft: "outline",
  rejected: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Published",
  approved: "Approved · pay to publish",
  pending: "Pending review",
  draft: "Draft",
  rejected: "Rejected",
};

export function ListingsTable({ listings: initial }: { listings: Listing[] }) {
  const [listings, setListings] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function deleteListing(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/business/listings/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success("Listing deleted");
    } else {
      toast.error("Failed to delete listing");
    }
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No listings yet.</p>
        <Button className="mt-4" onClick={() => router.push("/business/listings/new" as any)}>
          Add your first listing
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">{l.name}</TableCell>
              <TableCell className="text-muted-foreground capitalize">{l.citySlug}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                  {STATUS_LABEL[l.status] ?? l.status}
                </Badge>
                {l.status === "rejected" && l.rejectionReason && (
                  <p className="mt-1 max-w-[200px] text-xs text-destructive">
                    {l.rejectionReason}
                  </p>
                )}
              </TableCell>
              <TableCell>{l.viewCount}</TableCell>
              <TableCell>
                {l.rating > 0 ? `${l.rating.toFixed(1)} (${l.reviewCount})` : "—"}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {l.status === "approved" && !l.paid && (
                  <span className="inline-block align-middle mr-1">
                    <PayButton
                      purpose="listing_fee"
                      targetId={l.id}
                      label="Publish · 50 GEL"
                      size="sm"
                    />
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => router.push(`/places/${l.slug}` as any)}
                  title="View"
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => router.push(`/business/listings/${l.id}/edit` as any)}
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deleting === l.id}
                  onClick={() => deleteListing(l.id, l.name)}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
