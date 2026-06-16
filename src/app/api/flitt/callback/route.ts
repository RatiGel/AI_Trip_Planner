import { connectDB } from "@/lib/db";
import { verifyCallback } from "@/lib/flitt";
import { PaymentModel, type IPayment } from "@/lib/models/payment";
import { PlaceModel } from "@/lib/models/place";
import { ReservationModel } from "@/lib/models/reservation";

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

  payment.status = "paid";
  await payment.save();
  await applySideEffect(payment);

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
  }
}
