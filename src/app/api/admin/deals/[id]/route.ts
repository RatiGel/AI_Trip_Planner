import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DealModel } from "@/lib/models/deal";
import { AuditLogModel } from "@/lib/models/audit-log";
import { requireAdmin } from "@/lib/require-admin";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const body = await req.json();
  await connectDB();
  const deal = await DealModel.findByIdAndUpdate(id, body, { new: true });
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

  const session = await auth();
  const admin = session!.user as { id?: string; email?: string };
  await AuditLogModel.create({
    adminId: admin.id,
    adminEmail: admin.email ?? "",
    action: body.action === "approve" ? "APPROVE_DEAL" : "REJECT_DEAL",
    targetType: "deal",
    targetId: id,
    metadata: { title: deal.title, ownerId: deal.ownerId },
  });

  return NextResponse.json({ id, status: deal.status });
}
