import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import "@/lib/models/index";
import { requireSuperadmin, isDenied } from "@/lib/permissions";

type FieldDescriptor = {
  name: string;
  type: string;
  required: boolean;
  enumValues?: string[];
};

function getSchemaFields(modelName: string): FieldDescriptor[] {
  try {
    const m = mongoose.model(modelName);
    return Object.entries(m.schema.paths)
      .filter(([name]) => name !== "__v")
      .map(([name, schemaType]) => ({
        name,
        type: (schemaType as { instance: string }).instance ?? "Mixed",
        required: !!(schemaType as { isRequired?: boolean }).isRequired,
        enumValues:
          ((schemaType as { enumValues?: string[] }).enumValues?.length
            ? (schemaType as { enumValues: string[] }).enumValues
            : undefined),
      }));
  } catch {
    return [];
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { collection } = await params;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 25;
  const filter = searchParams.get("filter") ?? "";

  await connectDB();

  if (!mongoose.modelNames().includes(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }

  const model = mongoose.model(collection);
  const query = filter
    ? {
        $or: [
          { name: { $regex: filter, $options: "i" } },
          { email: { $regex: filter, $options: "i" } },
          { slug: { $regex: filter, $options: "i" } },
        ],
      }
    : {};

  const [docs, total] = await Promise.all([
    model
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    model.countDocuments(query),
  ]);

  const fields = getSchemaFields(collection);

  return NextResponse.json({ docs, total, page, limit, fields });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const actor = await requireSuperadmin();
  if (isDenied(actor)) return actor;

  const { collection } = await params;
  const body = await req.json();

  await connectDB();
  if (!mongoose.modelNames().includes(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  }

  const model = mongoose.model(collection);
  const doc = await model.create(body);
  return NextResponse.json(doc, { status: 201 });
}
