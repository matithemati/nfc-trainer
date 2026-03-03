// app/api/clients/[clientId]/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { verifyClientOwnership, getStudioClientAndTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const db = await getDb();
    const logs = await db
      .collection("workouts")
      .find({ clientId: new ObjectId(clientId) })
      .sort({ date: 1 })
      .toArray();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    const body = await req.json();
    const { date, exercises } = body as {
      date: string;
      exercises: { name: string; sets: number; reps: number; weight?: number }[];
    };

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const db = await getDb();
    const log = { clientId: new ObjectId(clientId), date, exercises };

    const span = Sentry.getActiveSpan();
    if (span) span.setAttribute("exercises.count", exercises.length);

    const result = await db.collection("workouts").insertOne(log);
    const inserted = await db
      .collection("workouts")
      .findOne({ _id: result.insertedId });
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("Error creating log:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
    const { clientId } = await Promise.resolve(params);
    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    const body = await req.json();
    const { logId, date, exercises } = body as {
      logId: string;
      date?: string;
      exercises?: { name: string; sets: number; reps: number; weight?: number }[];
    };

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    const db = await getDb();
    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (exercises !== undefined) updateData.exercises = exercises;

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const result = await db.collection("workouts").updateOne(
      { _id: new ObjectId(logId), clientId: new ObjectId(clientId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Workout log not found" }, { status: 404 });
    }

    const updated = await db
      .collection("workouts")
      .findOne({ _id: new ObjectId(logId) } as any);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating log:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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
    const { clientId } = await Promise.resolve(params);
    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("logId");

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("workouts").deleteOne({
      _id: new ObjectId(logId),
      clientId: new ObjectId(clientId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Workout log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting log:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
