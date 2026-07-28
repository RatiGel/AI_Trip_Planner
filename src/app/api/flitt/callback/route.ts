import { connectDB } from "@/lib/db";
import { verifyCallback } from "@/lib/flitt";
import { PaymentModel, type IPayment } from "@/lib/models/payment";
import { PlaceModel } from "@/lib/models/place";
import { ReservationModel } from "@/lib/models/reservation";
import { VoucherModel } from "@/lib/models/voucher";
import { NotificationModel } from "@/lib/models/notification";
import { UserModel } from "@/lib/models/user";
import { createUniqueVoucher } from "@/lib/voucher";
import { mockDeals } from "@/lib/mock/deals";
import type { VoucherRecipient } from "@/types";

/**
 * Flitt server-to-server webhook. Flat JSON POST.
 * Verifies the SHA1 signature, then applies the purpose side-effect idempotently.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifyCallback(payload)) {
    return Response.json({ error: "Bad signature" }, { status: 400 });
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  if (!orderId) return Response.json({ error: "No order_id" }, { status: 400 });

  await connectDB();
  const payment = await PaymentModel.findOne({ orderId });
  if (!payment) return Response.json({ error: "Unknown order" }, { status: 404 });

  // Idempotency: already terminal → no-op.
  if (payment.status === "paid" || payment.status === "failed") {
    return Response.json({ ok: true, idempotent: true });
  }

  const approved =
    payload.response_status === "success" && payload.order_status === "approved";

  payment.rawCallback = payload;
  if (typeof payload.payment_id === "string") payment.flittPaymentId = payload.payment_id;

  if (!approved) {
    payment.status = "failed";
    await payment.save();
    return Response.json({ ok: true, status: "failed" });
  }

  // Run the side effect BEFORE marking the payment terminal. If it throws, the
  // payment stays non-terminal so Flitt's redelivery re-runs it (all side
  // effects are idempotent). Only after it succeeds do we persist "paid".
  await applySideEffect(payment);
  payment.status = "paid";
  await payment.save();

  return Response.json({ ok: true, status: "paid" });
}

async function applySideEffect(payment: IPayment) {
  switch (payment.purpose) {
    case "listing_fee":
      await PlaceModel.updateOne(
        { _id: payment.targetId },
        { paid: true, status: "active" }
      );
      break;
    case "reservation":
      await ReservationModel.updateOne(
        { _id: payment.targetId },
        { paymentStatus: "paid", status: "confirmed" }
      );
      break;
    case "ticket":
    case "service":
      // Ownership is recorded by the Payment record itself (status=paid,
      // userId, targetId/serviceId). No extra collection needed this phase.
      break;
    case "deal": {
      if (!payment.userId) break; // deals require login; nothing to key a voucher to

      const deal = mockDeals.find((d) => d.id === payment.targetId);
      const dealTitle = deal?.title ?? "Deal";

      // One pass per recipient. Orders placed before gifting existed have no
      // recipients array — treat those as a single unnamed pass for the buyer.
      const recipients: VoucherRecipient[] = payment.recipients?.length
        ? payment.recipients
        : [{ firstName: "", lastName: "" }];
      // payment.amount covers every pass, so each one carries the unit price.
      const unitGEL = Math.round(payment.amount) / 100 / recipients.length;

      // Buyer identity is snapshotted onto the voucher (it is printed on the
      // pass), so look it up before creating the voucher rather than only for
      // the notification.
      const buyer = await UserModel.findById(payment.userId)
        .select("name email")
        .lean<{ name?: string; email?: string }>();

      // Idempotent per recipient: reuse existing passes (redelivery) and create
      // only the missing ones. The unique (paymentOrderId, recipientIndex)
      // index is the backstop for races.
      const existing = await VoucherModel.find({ paymentOrderId: payment.orderId })
        .select("code recipientIndex")
        .lean<{ code: string; recipientIndex: number }[]>();
      const byIndex = new Map(existing.map((v) => [v.recipientIndex, v.code]));

      const voucherCodes: string[] = [];
      for (const [recipientIndex, r] of recipients.entries()) {
        const found = byIndex.get(recipientIndex);
        if (found) {
          voucherCodes.push(found);
          continue;
        }
        const created = await createUniqueVoucher({
          userId: payment.userId,
          dealId: payment.targetId,
          dealTitle,
          amountGEL: unitGEL,
          paymentOrderId: payment.orderId,
          recipientIndex,
          buyerName: buyer?.name ?? "",
          buyerEmail: buyer?.email ?? "",
          recipientFirstName: r.firstName,
          recipientLastName: r.lastName,
          recipientAge: r.age,
          businessName: deal?.businessName ?? "",
          businessAddress: deal?.address ?? "",
        });
        voucherCodes.push(created.code);
      }

      // Notification is created even if the vouchers already existed, so a
      // partial prior failure (voucher saved, notification not) self-heals on
      // redelivery. Its unique paymentOrderId index prevents a duplicate.
      if (payment.businessOwnerId) {
        await NotificationModel.create({
          ownerId: payment.businessOwnerId,
          type: "deal_purchase",
          dealId: payment.targetId,
          dealTitle,
          voucherCode: voucherCodes.join(", "),
          buyerName: buyer?.name ?? "",
          buyerEmail: buyer?.email ?? "",
          amountGEL: Math.round(payment.amount) / 100,
          paymentOrderId: payment.orderId,
        }).catch((e: unknown) => {
          // Duplicate notification (11000) is fine under re-delivery; rethrow others.
          const err = e as { code?: number };
          if (err.code !== 11000) throw e;
        });
      }
      break;
    }
  }
}
