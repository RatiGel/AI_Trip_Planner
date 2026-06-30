import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { AuditLogModel } from "@/lib/models/audit-log";
import { requireAdmin } from "@/lib/require-admin";

// Editable via the deals manager. `status` is controlled by the approve/reject
// PATCH only; `ownerId` is never reassigned through the editor.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "priceOriginal",
  "priceGEL",
  "discountPct",
  "category",
  "validUntil",
  "image",
  "badge",
  "active",
] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  await connectDB();
  const deal = await DealModel.findByIdAndUpdate(id, update, { new: true });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  await connectDB();
  await DealModel.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}

/** Approve or reject a (typically business-submitted) deal. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "reject";
    reason?: string;
  };
  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await connectDB();
  const deal = await DealModel.findById(id);
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "approve") {
    deal.status = "approved";
    deal.rejectionReason = "";
  } else {
    deal.status = "rejected";
    deal.rejectionReason = (body.reason as string)?.slice(0, 500) || "";
  }
  await deal.save();

  await AuditLogModel.create({
    adminId: gate.user.id,
    adminEmail: gate.user.email ?? "",
    action: body.action === "approve" ? "APPROVE_DEAL" : "REJECT_DEAL",
    targetType: "deal",
    targetId: id,
    metadata: { title: deal.title, ownerId: deal.ownerId },
  });

  return NextResponse.json({ id, status: deal.status });
}
