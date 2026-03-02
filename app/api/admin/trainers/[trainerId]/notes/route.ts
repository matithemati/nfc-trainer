// app/api/admin/trainers/[trainerId]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdminOperation, getClientIp, getUserAgent } from "@/lib/admin";
import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();

    const { trainerId } = await Promise.resolve(params);

    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID" }, { status: 400 });
    }

    const trainerIdObj = new ObjectId(trainerId);
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: trainerIdObj, deletedAt: { $exists: false } });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    const before = { ...trainer };
    const notes = trainer.notes || [];
    notes.push({
      timestamp: new Date(),
      adminId: admin._id,
      note: note.trim(),
    });

    await db.collection("trainers").updateOne(
      { _id: trainerIdObj },
      {
        $set: {
          notes,
          updatedAt: new Date(),
        },
      }
    );

    const after = await db
      .collection("trainers")
      .findOne({ _id: trainerIdObj });

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "update",
      "trainers",
      trainerIdObj,
      {
        before,
        after,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
        note: `Added note: ${note.trim()}`,
      }
    );

    return NextResponse.json(after);
  } catch (error) {
    console.error("Error adding note:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
