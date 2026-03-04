// app/api/admin/trainers/[trainerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdminOperation, getClientIp, getUserAgent } from "@/lib/admin";
import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  try {
    await requireAdmin();
    const db = await getDb();

    const { trainerId } = await Promise.resolve(params);

    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID" }, { status: 400 });
    }

    const trainerObjId = new ObjectId(trainerId);
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: trainerObjId });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const clientsCount = await db.collection("clients").countDocuments({
      trainerId: trainerObjId,
      deletedAt: { $exists: false },
    });

    return NextResponse.json({ ...trainer, clientsCount });
  } catch (error) {
    console.error("Error fetching trainer:", error);
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

export async function PATCH(
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
      .findOne({ _id: trainerIdObj });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, expirationDate, pricePerMonth, type, maxClients } = body;

    // Validation
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (email !== undefined && !email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check email uniqueness if email is being changed
    if (email && email !== trainer.email) {
      const existing = await db
        .collection("trainers")
        .findOne({ email, deletedAt: { $exists: false }, _id: { $ne: trainerIdObj } });
      if (existing) {
        return NextResponse.json({ error: "Email must be unique" }, { status: 400 });
      }
    }

    const before = { ...trainer };
    const update: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (expirationDate !== undefined) update.expirationDate = expirationDate || null;
    if (pricePerMonth !== undefined) update.pricePerMonth = pricePerMonth || null;
    if (type !== undefined) update.type = type === "personal" ? "personal" : "studio";
    if (maxClients !== undefined) update.maxClients = parseInt(maxClients) || 10;

    await db.collection("trainers").updateOne(
      { _id: trainerIdObj },
      { $set: update }
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
      }
    );

    Sentry.logger.info(`Trainer updated: ${trainerId}`);
    return NextResponse.json(after);
  } catch (error) {
    console.error("Error updating trainer:", error);
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

export async function DELETE(
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
      .findOne({ _id: trainerIdObj });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const before = { ...trainer };

    // Soft delete
    await db.collection("trainers").updateOne(
      { _id: trainerIdObj },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: admin._id,
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
      "delete",
      "trainers",
      trainerIdObj,
      {
        before,
        after,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      }
    );

    Sentry.logger.info(`Trainer deleted: ${trainerId} (${before.name})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trainer:", error);
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
