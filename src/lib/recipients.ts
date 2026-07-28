import { MINOR_AGE_LIMIT, type VoucherRecipient } from "@/types";

/** Hard cap on recipients in one checkout — keeps the payment amount sane. */
export const MAX_RECIPIENTS = 10;
const MAX_NAME_LEN = 60;

export interface RecipientError {
  index: number;
  field: "firstName" | "lastName" | "age";
  message: string;
}

/**
 * Validate and normalise recipients. Shared by the checkout form and the
 * checkout API so client-side and server-side rules can never drift — the API
 * treats the client's input as untrusted and re-runs this regardless.
 */
export function parseRecipients(
  input: unknown
): { ok: true; recipients: VoucherRecipient[] } | { ok: false; errors: RecipientError[] } {
  const errors: RecipientError[] = [];

  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, errors: [{ index: 0, field: "firstName", message: "At least one recipient is required" }] };
  }
  if (input.length > MAX_RECIPIENTS) {
    return {
      ok: false,
      errors: [{ index: 0, field: "firstName", message: `At most ${MAX_RECIPIENTS} recipients per purchase` }],
    };
  }

  const recipients: VoucherRecipient[] = [];
  input.forEach((raw, index) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const firstName = typeof r.firstName === "string" ? r.firstName.trim() : "";
    const lastName = typeof r.lastName === "string" ? r.lastName.trim() : "";

    if (!firstName) errors.push({ index, field: "firstName", message: "First name is required" });
    else if (firstName.length > MAX_NAME_LEN)
      errors.push({ index, field: "firstName", message: `Max ${MAX_NAME_LEN} characters` });

    if (!lastName) errors.push({ index, field: "lastName", message: "Last name is required" });
    else if (lastName.length > MAX_NAME_LEN)
      errors.push({ index, field: "lastName", message: `Max ${MAX_NAME_LEN} characters` });

    // Age is present only when the buyer flagged the recipient as a minor. An
    // age of 18+ with that flag set is contradictory, so reject it rather than
    // silently storing an adult age in the minor field.
    let age: number | undefined;
    const isMinor = r.isMinor === true || r.age != null;
    if (isMinor) {
      const n = typeof r.age === "number" ? r.age : Number(r.age);
      if (!Number.isInteger(n) || n < 1 || n >= MINOR_AGE_LIMIT) {
        errors.push({
          index,
          field: "age",
          message: `Enter an age from 1 to ${MINOR_AGE_LIMIT - 1}`,
        });
      } else {
        age = n;
      }
    }

    recipients.push({ firstName, lastName, ...(age != null ? { age } : {}) });
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, recipients };
}

/** "Ana Beridze (age 12)" — used on the pass and in notifications. */
export function formatRecipient(r: VoucherRecipient): string {
  const name = `${r.firstName} ${r.lastName}`.trim();
  return r.age != null ? `${name} (age ${r.age})` : name;
}
