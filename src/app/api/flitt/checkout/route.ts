import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { createCheckout } from "@/lib/flitt";
import { mockDeals } from "@/lib/mock/deals";
import { PaymentModel, type PaymentPurpose } from "@/lib/models/payment";
import { PlaceModel } from "@/lib/models/place";
import { ReservationModel } from "@/lib/models/reservation";
import { TicketModel } from "@/lib/models/ticket";
import { UserModel } from "@/lib/models/user";
import { parseRecipients } from "@/lib/recipients";
import type { VoucherRecipient } from "@/types";

const LISTING_FEE_TETRI = 5000; // 50 GEL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const BUSINESS_ROLES = ["business", "admin", "superadmin"];

interface Body {
  purpose: PaymentPurpose;
  targetId: string;
  serviceId?: string;
  locale?: string;
  amount?: number; // GEL, sent by client but ignored server-side; price is resolved from the target record
  desc?: string;
  /** Deal purchases only: who the passes are for. One voucher per entry. */
  recipients?: unknown;
}

/**
 * Resolve the amount (minor units) + description + owner from the target record.
 * Never trust a client-supplied amount.
 */
async function resolve(
  body: Body,
  userId: string | undefined,
  role: string,
  recipients: VoucherRecipient[]
): Promise<{ amount: number; desc: string; businessOwnerId?: string } | { error: string; status: number }> {
  switch (body.purpose) {
    case "listing_fee": {
      const place = await PlaceModel.findById(body.targetId).lean<{ ownerId?: string; name: string; paid?: boolean; status?: string }>();
      if (!place) return { error: "Place not found", status: 404 };
      if (!BUSINESS_ROLES.includes(role)) return { error: "Forbidden", status: 403 };
      if (place.ownerId !== userId && role !== "superadmin")
        return { error: "Not your listing", status: 403 };
      if (place.paid) return { error: "Already paid", status: 409 };
      // Payment only unlocks publishing AFTER admin approval. Block paying for a
      // listing still in draft/pending/rejected so the review gate can't be skipped.
      if (place.status !== "approved")
        return { error: "Listing must be approved before payment", status: 409 };
      return { amount: LISTING_FEE_TETRI, desc: `Listing fee: ${place.name}`, businessOwnerId: place.ownerId };
    }
    case "reservation": {
      const r = await ReservationModel.findById(body.targetId).lean<{
        userId?: string;
        priceGEL?: number;
        placeId: string;
        paymentStatus?: string;
      }>();
      if (!r) return { error: "Reservation not found", status: 404 };
      if (r.userId && r.userId !== userId) return { error: "Not your reservation", status: 403 };
      if (r.paymentStatus === "paid") return { error: "Already paid", status: 409 };
      if (!r.priceGEL || r.priceGEL <= 0) return { error: "Reservation has no price", status: 400 };
      const place = await PlaceModel.findById(r.placeId).lean<{ ownerId?: string }>();
      return { amount: Math.round(r.priceGEL * 100), desc: `Reservation ${body.targetId}`, businessOwnerId: place?.ownerId };
    }
    case "ticket": {
      const t = await TicketModel.findById(body.targetId).lean<{ priceGEL: number; operator: string }>();
      if (!t) return { error: "Ticket not found", status: 404 };
      if (!t.priceGEL || t.priceGEL <= 0) return { error: "Ticket has no price", status: 400 };
      return { amount: Math.round(t.priceGEL * 100), desc: `Ticket: ${t.operator}` };
    }
    case "service": {
      const place = await PlaceModel.findById(body.targetId).lean<{
        ownerId?: string;
        services?: { _id: unknown; name: string; priceGEL: number }[];
      }>();
      if (!place) return { error: "Place not found", status: 404 };
      const svc = place.services?.find((s) => String(s._id) === body.serviceId);
      if (!svc) return { error: "Service not found", status: 404 };
      if (!svc.priceGEL || svc.priceGEL <= 0) return { error: "Service has no price", status: 400 };
      return { amount: Math.round(svc.priceGEL * 100), desc: `Service: ${svc.name}`, businessOwnerId: place.ownerId };
    }
    case "deal": {
      const deal = mockDeals.find((d) => d.id === body.targetId);
      if (!deal) return { error: "Deal not found", status: 404 };
      if (!deal.priceGEL || deal.priceGEL <= 0) return { error: "Deal has no valid price", status: 400 };
      // Resolve owner email → user id so the notification later targets a real owner.
      const owner = await UserModel.findOne({ email: deal.ownerEmail })
        .select("_id")
        .lean<{ _id: unknown }>();
      // One pass per recipient, so charge the unit price that many times.
      const qty = recipients.length;
      return {
        amount: Math.round(deal.priceGEL * 100) * qty,
        desc: qty > 1 ? `Deal: ${deal.title} × ${qty}` : `Deal: ${deal.title}`,
        businessOwnerId: owner ? String(owner._id) : undefined,
      };
    }
    default:
      return { error: "Invalid purpose", status: 400 };
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.purpose || !body.targetId) {
    return Response.json({ error: "purpose and targetId required" }, { status: 400 });
  }

  // All purposes (including deals) require login — a voucher is keyed to the buyer.
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role ?? "tourist";

  const orderId = `${body.purpose}_${randomUUID()}`;
  const locale = body.locale ?? "en";

  try {
    await connectDB();

    // Deals issue named passes. The client's recipient list is untrusted, so
    // re-validate it here; when the buyer didn't name anyone, the pass is for
    // themselves and their account name is used.
    let recipients: VoucherRecipient[] = [];
    if (body.purpose === "deal") {
      if (body.recipients != null) {
        const parsed = parseRecipients(body.recipients);
        if (!parsed.ok) {
          return Response.json(
            { error: parsed.errors[0].message, errors: parsed.errors },
            { status: 400 }
          );
        }
        recipients = parsed.recipients;
      } else {
        const buyer = await UserModel.findById(userId)
          .select("name")
          .lean<{ name?: string } | null>();
        const [first = "", ...rest] = (buyer?.name ?? "").trim().split(/\s+/);
        recipients = [{ firstName: first, lastName: rest.join(" ") }];
      }
    }

    const resolved = await resolve(body, userId, role, recipients);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: resolved.status });
    }

    await PaymentModel.create({
      orderId,
      purpose: body.purpose,
      targetId: body.targetId,
      serviceId: body.serviceId,
      userId,
      businessOwnerId: resolved.businessOwnerId,
      amount: resolved.amount,
      currency: "GEL",
      status: "pending",
      ...(recipients.length ? { recipients } : {}),
    });

    const { checkoutUrl, paymentId } = await createCheckout({
      orderId,
      amount: resolved.amount,
      desc: resolved.desc,
      callbackUrl: `${APP_URL}/api/flitt/callback`,
      responseUrl: `${APP_URL}/${locale}/payment/result?order_id=${orderId}`,
    });
    if (paymentId) {
      await PaymentModel.updateOne({ orderId }, { flittPaymentId: paymentId });
    }
    return Response.json({ checkout_url: checkoutUrl, order_id: orderId });
  } catch (e) {
    console.error("[flitt/checkout] error:", e);
    await PaymentModel.updateOne({ orderId }, { status: "failed" }).catch(() => {});
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
