"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_RECIPIENTS, parseRecipients, type RecipientError } from "@/lib/recipients";
import { MINOR_AGE_LIMIT, type VoucherRecipient } from "@/types";

/** One row of the form. `age` stays a string so a half-typed value isn't coerced to NaN. */
interface RecipientDraft {
  firstName: string;
  lastName: string;
  isMinor: boolean;
  age: string;
}

const emptyDraft = (): RecipientDraft => ({
  firstName: "",
  lastName: "",
  isMinor: false,
  age: "",
});

export interface RecipientsDialogLabels {
  title: string;
  description: string;
  firstName: string;
  lastName: string;
  isMinor: string;
  age: string;
  addPerson: string;
  remove: string;
  passLabel: string;
  cancel: string;
  confirm: string;
  total: string;
}

export function RecipientsDialog({
  open,
  onOpenChange,
  unitPriceGEL,
  labels,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitPriceGEL: number;
  labels: RecipientsDialogLabels;
  onConfirm: (recipients: VoucherRecipient[]) => void;
}) {
  const [drafts, setDrafts] = useState<RecipientDraft[]>([emptyDraft()]);
  const [errors, setErrors] = useState<RecipientError[]>([]);

  function update(index: number, patch: Partial<RecipientDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function errorFor(index: number, field: RecipientError["field"]) {
    return errors.find((e) => e.index === index && e.field === field)?.message;
  }

  function submit() {
    // Validate with the same parser the API uses, so the two can't disagree.
    const parsed = parseRecipients(
      drafts.map((d) => ({
        firstName: d.firstName,
        lastName: d.lastName,
        isMinor: d.isMinor,
        age: d.isMinor ? Number(d.age) : undefined,
      }))
    );
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors([]);
    onConfirm(parsed.recipients);
  }

  const total = unitPriceGEL * drafts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {drafts.map((d, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {labels.passLabel} {i + 1}
                </p>
                {drafts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDrafts((prev) => prev.filter((_, x) => x !== i));
                      setErrors([]);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">{labels.remove}</span>
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`first-${i}`}>{labels.firstName}</Label>
                  <Input
                    id={`first-${i}`}
                    value={d.firstName}
                    onChange={(e) => update(i, { firstName: e.target.value })}
                    aria-invalid={Boolean(errorFor(i, "firstName"))}
                  />
                  {errorFor(i, "firstName") && (
                    <p className="text-xs text-destructive">{errorFor(i, "firstName")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`last-${i}`}>{labels.lastName}</Label>
                  <Input
                    id={`last-${i}`}
                    value={d.lastName}
                    onChange={(e) => update(i, { lastName: e.target.value })}
                    aria-invalid={Boolean(errorFor(i, "lastName"))}
                  />
                  {errorFor(i, "lastName") && (
                    <p className="text-xs text-destructive">{errorFor(i, "lastName")}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  id={`minor-${i}`}
                  checked={d.isMinor}
                  onCheckedChange={(checked) =>
                    update(i, { isMinor: checked === true, age: "" })
                  }
                />
                <Label htmlFor={`minor-${i}`} className="text-sm font-normal">
                  {labels.isMinor}
                </Label>
              </div>

              {d.isMinor && (
                <div className="mt-3 max-w-[140px] space-y-1.5">
                  <Label htmlFor={`age-${i}`}>{labels.age}</Label>
                  <Input
                    id={`age-${i}`}
                    type="number"
                    min={1}
                    max={MINOR_AGE_LIMIT - 1}
                    value={d.age}
                    onChange={(e) => update(i, { age: e.target.value })}
                    aria-invalid={Boolean(errorFor(i, "age"))}
                  />
                  {errorFor(i, "age") && (
                    <p className="text-xs text-destructive">{errorFor(i, "age")}</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {drafts.length < MAX_RECIPIENTS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
            >
              <Plus className="size-3.5" />
              {labels.addPerson}
            </Button>
          )}
        </div>

        <DialogFooter className="mt-2 sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {labels.total}{" "}
            <span className="font-semibold text-foreground">₾ {total}</span>
            {drafts.length > 1 && ` (${drafts.length} × ₾${unitPriceGEL})`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {labels.cancel}
            </Button>
            <Button type="button" onClick={submit}>
              <UserPlus className="size-3.5" />
              {labels.confirm}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
