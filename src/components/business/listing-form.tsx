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
import { Save } from "lucide-react";
import { mockCities } from "@/lib/mock/cities";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug } from "@/types";

interface ListingFormProps {
  listingId?: string;
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
    website: string;
    reservable: boolean;
  };
}

export function ListingForm({ listingId, defaultValues }: ListingFormProps) {
  const router = useRouter();
  const isEdit = !!listingId;

  const [city, setCity] = useState(defaultValues?.citySlug ?? mockCities[0]?.slug ?? "");
  const [cats, setCats] = useState<Set<CategorySlug>>(
    new Set(defaultValues?.categories ?? [])
  );
  const [reservable, setReservable] = useState(defaultValues?.reservable ?? false);
  const [priceLevel, setPriceLevel] = useState(String(defaultValues?.priceLevel ?? 2));
  const [saving, setSaving] = useState(false);

  function toggleCat(c: CategorySlug) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
      website: fd.get("website") as string,
      reservable,
    };

    setSaving(true);
    const res = await fetch(
      isEdit ? `/api/business/listings/${listingId}` : "/api/business/listings",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? "Listing updated" : "Listing submitted for review");
      router.push("/business/listings" as any);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name (EN) *</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameKa">Name (KA)</Label>
          <Input id="nameKa" name="nameKa" defaultValue={defaultValues?.nameKa} />
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Price level</Label>
          <Select value={priceLevel} onValueChange={setPriceLevel}>
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
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+995 …" defaultValue={defaultValues?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" placeholder="https://" defaultValue={defaultValues?.website} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="reservable"
          checked={reservable}
          onCheckedChange={(v) => setReservable(!!v)}
        />
        <Label htmlFor="reservable">Reservable</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="size-4" />
          {saving ? "Saving…" : isEdit ? "Save changes" : "Submit listing"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/business/listings" as any)}>
          Cancel
        </Button>
      </div>

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          New listings require admin approval before going live.
        </p>
      )}
    </form>
  );
}
