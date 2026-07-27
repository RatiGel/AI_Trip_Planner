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
      const amountGEL = Math.round(payment.amount) / 100;

      // Idempotent voucher: reuse an existing one (redelivery) or create it.
      // The Voucher's unique paymentOrderId index is the backstop for races.
      const existing = await VoucherModel.findOne({ paymentOrderId: payment.orderId })
        .select("code")
        .lean<{ code: string } | null>();
      const voucherCode = existing
        ? existing.code
        : (
            await createUniqueVoucher({
              userId: payment.userId,
              dealId: payment.targetId,
              dealTitle,
              amountGEL,
              paymentOrderId: payment.orderId,
            })
          ).code;

      // Notification is created even if the voucher already existed, so a
      // partial prior failure (voucher saved, notification not) self-heals on
      // redelivery. Its unique paymentOrderId index prevents a duplicate.
      if (payment.businessOwnerId) {
        const buyer = await UserModel.findById(payment.userId)
          .select("name email")
          .lean<{ name?: string; email?: string }>();
        await NotificationModel.create({
          ownerId: payment.businessOwnerId,
          type: "deal_purchase",
          dealId: payment.targetId,
          dealTitle,
          voucherCode,
          buyerName: buyer?.name ?? "",
          buyerEmail: buyer?.email ?? "",
          amountGEL,
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
