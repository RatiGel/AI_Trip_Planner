"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Save } from "lucide-react";
import { toast } from "sonner";
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
import { mockCities } from "@/lib/mock/cities";
import { mockCategories } from "@/lib/mock/categories";
import type { CategorySlug } from "@/types";

export function PlaceForm() {
  const t = useTranslations("admin");
  const tCat = useTranslations("categories");
  const [city, setCity] = useState(mockCities[0]?.slug ?? "");
  const [cats, setCats] = useState<Set<CategorySlug>>(new Set());
  const [reservable, setReservable] = useState(false);

  function toggle(c: CategorySlug) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    toast.success(t("save"));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name-en">Name (EN)</Label>
          <Input id="name-en" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name-ka">სახელი (KA)</Label>
          <Input id="name-ka" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Select value={city} onValueChange={(v) => v && setCity(v)}>
            <SelectTrigger id="city">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockCities.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" type="number" step="any" />
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
              <Checkbox checked={cats.has(c.slug)} onCheckedChange={() => toggle(c.slug)} />
              <span>{tCat(c.slug)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="desc-en">Description (EN)</Label>
          <Textarea id="desc-en" rows={5} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc-ka">აღწერა (KA)</Label>
          <Textarea id="desc-ka" rows={5} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price level</Label>
          <Select defaultValue="2">
            <SelectTrigger id="price">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{"$".repeat(n)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+995 …" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="url" placeholder="https://" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="res" checked={reservable} onCheckedChange={(v) => setReservable(!!v)} />
        <Label htmlFor="res">Reservable</Label>
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground">
          <ImagePlus className="size-5" />
          <span>Drag and drop, or click to upload</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost">{t("cancel")}</Button>
        <Button type="submit"><Save className="size-4" /> {t("save")}</Button>
      </div>
    </form>
  );
}
