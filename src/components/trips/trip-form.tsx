"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TripItem {
  placeId: string;
  time: string;
  notes?: string;
  name: string;
}

interface TripDay {
  date: string;
  items: TripItem[];
}

interface TripFormProps {
  tripId: string;
  defaultValues: {
    title: string;
    days: TripDay[];
  };
}

interface PlaceResult {
  id: string;
  name: string;
  category: string;
}

export function TripForm({ tripId, defaultValues }: TripFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultValues.title);
  const [days, setDays] = useState<TripDay[]>(defaultValues.days);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [pickerOpenForDay, setPickerOpenForDay] = useState<number | null>(null);

  async function runSearch(q: string) {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
    setResults(res.ok ? await res.json() : []);
  }

  function addDay() {
    const today = defaultValues.days[0]?.date ?? "";
    setDays((prev) => [...prev, { date: today, items: [] }]);
  }

  function removeDay(dayIndex: number) {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex));
  }

  function setDayDate(dayIndex: number, date: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, date } : d)));
  }

  function addItem(dayIndex: number, place: PlaceResult) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, items: [...d.items, { placeId: place.id, time: "09:00", notes: "", name: place.name }] }
          : d
      )
    );
    setPickerOpenForDay(null);
    setSearch("");
    setResults([]);
  }

  function removeItem(dayIndex: number, itemIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) } : d
      )
    );
  }

  function setItem(dayIndex: number, itemIndex: number, patch: Partial<TripItem>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              items: d.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)),
            }
          : d
      )
    );
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Trip title is required");
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      days: days.map((d) => ({
        date: d.date,
        items: d.items.map((it) => ({ placeId: it.placeId, time: it.time, notes: it.notes })),
      })),
    };
    const res = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Trip saved");
      router.push("/trips");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to save trip");
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="trip-title">Trip title</Label>
        <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor={`day-date-${dayIndex}`}>Date</Label>
                <Input
                  id={`day-date-${dayIndex}`}
                  type="date"
                  value={day.date}
                  onChange={(e) => setDayDate(dayIndex, e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                title="Remove day"
                onClick={() => removeDay(dayIndex)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <ul className="mt-4 space-y-3">
              {day.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e) => setItem(dayIndex, itemIndex, { time: e.target.value })}
                    className="w-28"
                  />
                  <span className="min-w-32 text-sm font-medium">{item.name}</span>
                  <Input
                    placeholder="Notes"
                    value={item.notes ?? ""}
                    onChange={(e) => setItem(dayIndex, itemIndex, { notes: e.target.value })}
                    className="flex-1 min-w-40"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    title="Remove stop"
                    onClick={() => removeItem(dayIndex, itemIndex)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <Popover
              open={pickerOpenForDay === dayIndex}
              onOpenChange={(open) => setPickerOpenForDay(open ? dayIndex : null)}
            >
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="size-4" />
                    Add stop
                  </Button>
                }
              />
              <PopoverContent className="w-72 p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search places…"
                    value={search}
                    onValueChange={runSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No places found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((place) => (
                        <CommandItem
                          key={place.id}
                          value={place.id}
                          onSelect={() => addItem(dayIndex, place)}
                        >
                          {place.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDay}>
        <Plus className="size-4" />
        Add day
      </Button>

      <div className="flex gap-2 border-t border-border pt-6">
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/trips")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
