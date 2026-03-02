// app/api/admin/trainers/[trainerId]/prolong/route.ts
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
    const { months } = body;

    if (![1, 3, 6, 12].includes(months)) {
      return NextResponse.json(
        { error: "Invalid months value. Must be 1, 3, 6, or 12" },
        { status: 400 }
      );
    }

    const before = { ...trainer };
    const now = new Date();
    const currentExpiration = trainer.expirationDate
      ? new Date(trainer.expirationDate)
      : null;

    // Extend from max(currentExpiration, now)
    const baseDate = currentExpiration && currentExpiration > now
      ? currentExpiration
      : now;

    const newExpirationDate = new Date(baseDate);
    newExpirationDate.setMonth(newExpirationDate.getMonth() + months);

    await db.collection("trainers").updateOne(
      { _id: trainerIdObj },
      {
        $set: {
          expirationDate: newExpirationDate.toISOString(),
          updatedAt: now,
        },
      }
    );

    const after = await db
      .collection("trainers")
      .findOne({ _id: trainerIdObj });

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "prolong",
      "trainers",
      trainerIdObj,
      {
        before,
        after,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
        note: `Prolonged membership by ${months} month(s)`,
      }
    );

    Sentry.logger.info(`Trainer membership prolonged: ${trainerId}, +${months} months, new expiration: ${newExpirationDate.toISOString()}`);
    return NextResponse.json(after);
  } catch (error) {
    console.error("Error prolonging membership:", error);
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
