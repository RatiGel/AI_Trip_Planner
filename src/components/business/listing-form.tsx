"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Send } from "lucide-react";
import { mockCities } from "@/lib/mock/cities";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug, ListingStatus, Socials } from "@/types";

interface OpeningHour {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function defaultHours(existing?: OpeningHour[]): OpeningHour[] {
  return DAYS.map((_, i) => {
    const found = existing?.find((h) => h.day === i);
    return found ?? { day: i, open: "09:00", close: "18:00", closed: false };
  });
}

interface ListingFormProps {
  listingId?: string;
  /** Current lifecycle status (edit mode only). Drives which submit actions show. */
  status?: ListingStatus;
  defaultValues?: {
    name: string;
    nameKa: string;
    citySlug: string;
    address: string;
    lng: number;
    lat: number;
    description: string;
    descriptionKa: string;
    categories: CategorySlug[];
    priceLevel: number;
    phone: string;
    email: string;
    website: string;
    socials: Socials;
    openingHours: OpeningHour[];
    reservable: boolean;
  };
}

export function ListingForm({ listingId, status, defaultValues }: ListingFormProps) {
  const router = useRouter();
  const isEdit = !!listingId;

  const [city, setCity] = useState(defaultValues?.citySlug ?? mockCities[0]?.slug ?? "");
  const [cats, setCats] = useState<Set<CategorySlug>>(
    new Set(defaultValues?.categories ?? [])
  );
  const [reservable, setReservable] = useState(defaultValues?.reservable ?? false);
  const [priceLevel, setPriceLevel] = useState(String(defaultValues?.priceLevel ?? 2));
  const [hours, setHours] = useState<OpeningHour[]>(defaultHours(defaultValues?.openingHours));
  const [socials, setSocials] = useState<Socials>(defaultValues?.socials ?? {});
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);

  function toggleCat(c: CategorySlug) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function setHour(i: number, patch: Partial<OpeningHour>) {
    setHours((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  async function save(form: HTMLFormElement, mode: "draft" | "submit") {
    const fd = new FormData(form);
    const body = {
      name: fd.get("name") as string,
      nameKa: fd.get("nameKa") as string,
      citySlug: city,
      address: fd.get("address") as string,
      lng: parseFloat((fd.get("lng") as string) || "0"),
      lat: parseFloat((fd.get("lat") as string) || "0"),
      description: fd.get("description") as string,
      descriptionKa: fd.get("descriptionKa") as string,
      categories: Array.from(cats),
      priceLevel: parseInt(priceLevel),
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      website: fd.get("website") as string,
      socials,
      openingHours: hours,
      reservable,
      // create: draft flag picks status. edit: status field requests a transition.
      ...(isEdit
        ? { status: mode === "submit" ? "pending" : "draft" }
        : { draft: mode === "draft" }),
    };

    if (!body.name) {
      toast.error("Business name is required");
      return;
    }

    setSaving(mode);
    const res = await fetch(
      isEdit ? `/api/business/listings/${listingId}` : "/api/business/listings",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(null);

    if (res.ok) {
      toast.success(
        mode === "draft" ? "Saved as draft" : "Submitted for review"
      );
      router.push("/business/listings" as Parameters<typeof router.push>[0]);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to save");
    }
  }

  // In edit mode, only show "submit for review" when the listing isn't already
  // in/past review (pending/approved/active stay as-is unless saved back to draft).
  const canSubmit = !isEdit || ["draft", "rejected"].includes(status ?? "draft");

  return (
    <form className="space-y-8 max-w-2xl">
      {/* Basics */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Business details
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business name (EN) *</Label>
            <Input id="name" name="name" required defaultValue={defaultValues?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nameKa">Business name (KA)</Label>
            <Input id="nameKa" name="nameKa" defaultValue={defaultValues?.nameKa} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex flex-wrap gap-2">
            {mockCategories.map((c) => (
              <label
                key={c.slug}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-accent has-[input:checked]:border-primary has-[input:checked]:bg-primary/10"
              >
                <Checkbox
                  checked={cats.has(c.slug)}
                  onCheckedChange={() => toggleCat(c.slug)}
                />
                <span className="capitalize">{c.slug}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="description">Description (EN)</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={defaultValues?.description} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descriptionKa">Description (KA)</Label>
            <Textarea id="descriptionKa" name="descriptionKa" rows={4} defaultValue={defaultValues?.descriptionKa} />
          </div>
        </div>

        <div className="space-y-2 max-w-[180px]">
          <Label>Price level</Label>
          <Select value={priceLevel} onValueChange={(v) => v != null && setPriceLevel(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {"$".repeat(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Location
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>City *</Label>
            <Select value={city} onValueChange={(v) => v && setCity(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockCities.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={defaultValues?.address} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" name="lng" type="number" step="any" defaultValue={defaultValues?.lng} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" name="lat" type="number" step="any" defaultValue={defaultValues?.lat} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Find your coordinates on Google Maps: right-click your location → click the
          lat/long to copy.
        </p>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contact
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+995 …" defaultValue={defaultValues?.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="hello@…" defaultValue={defaultValues?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="url" placeholder="https://" defaultValue={defaultValues?.website} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["x", "X / Twitter"],
              ["tiktok", "TikTok"],
              ["youtube", "YouTube"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`s-${key}`}>{label}</Label>
              <Input
                id={`s-${key}`}
                type="url"
                placeholder="https://"
                value={socials[key] ?? ""}
                onChange={(e) => setSocials((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Opening hours */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Opening hours
        </h2>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-12 text-sm font-medium">{DAYS[i]}</span>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={h.closed}
                  onCheckedChange={(v) => setHour(i, { closed: !!v })}
                />
                Closed
              </label>
              {!h.closed && (
                <>
                  <Input
                    type="time"
                    value={h.open}
                    onChange={(e) => setHour(i, { open: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={h.close}
                    onChange={(e) => setHour(i, { close: e.target.value })}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Options */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="reservable"
            checked={reservable}
            onCheckedChange={(v) => setReservable(!!v)}
          />
          <Label htmlFor="reservable">Accept reservations</Label>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          disabled={saving !== null}
          onClick={(e) => save(e.currentTarget.form!, "draft")}
        >
          <Save className="size-4" />
          {saving === "draft" ? "Saving…" : "Save as draft"}
        </Button>
        {canSubmit && (
          <Button
            type="button"
            disabled={saving !== null}
            onClick={(e) => save(e.currentTarget.form!, "submit")}
          >
            <Send className="size-4" />
            {saving === "submit" ? "Submitting…" : "Submit for review"}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => router.push("/business/listings" as Parameters<typeof router.push>[0])}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        After you submit, our team reviews your listing. Once approved, you pay a
        one-time 50 GEL listing fee to publish it live.
      </p>
    </form>
  );
}
