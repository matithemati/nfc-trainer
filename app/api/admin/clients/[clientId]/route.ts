// app/api/admin/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdminOperation, getClientIp, getUserAgent } from "@/lib/admin";
import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    await requireAdmin();
    const db = await getDb();

    const { clientId } = await Promise.resolve(params);

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const client = await db
      .collection("clients")
      .findOne({ _id: new ObjectId(clientId) });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
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
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();

    const { clientId } = await Promise.resolve(params);

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const client = await db
      .collection("clients")
      .findOne({ _id: new ObjectId(clientId) });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, trainerId } = body;

    // Validation
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const before = { ...client };
    const update: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) update.name = name;
    if (trainerId !== undefined) {
      if (!ObjectId.isValid(trainerId)) {
        return NextResponse.json({ error: "Invalid trainer ID" }, { status: 400 });
      }

      // Verify trainer exists
      const trainer = await db
        .collection("trainers")
        .findOne({ _id: new ObjectId(trainerId), deletedAt: { $exists: false } });

      if (!trainer) {
        return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
      }

      update.trainerId = new ObjectId(trainerId);
    }

    await db.collection("clients").updateOne(
      { _id: new ObjectId(clientId) },
      { $set: update }
    );

    const after = await db
      .collection("clients")
      .findOne({ _id: new ObjectId(clientId) });

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "update",
      "clients",
      new ObjectId(clientId),
      {
        before,
        after,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      }
    );

    return NextResponse.json(after);
  } catch (error) {
    console.error("Error updating client:", error);
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
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();

    const { clientId } = await Promise.resolve(params);

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const client = await db
      .collection("clients")
      .findOne({ _id: new ObjectId(clientId) });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const before = { ...client };

    // Soft delete
    await db.collection("clients").updateOne(
      { _id: clientId } as any,
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: admin._id,
          updatedAt: new Date(),
        },
      }
    );

    const after = await db
      .collection("clients")
      .findOne({ _id: clientId } as any);

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "delete",
      "clients",
      new ObjectId(clientId),
      {
        before,
        after,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      }
    );

    Sentry.logger.info(`Client deleted: ${clientId} (${before.name})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
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
