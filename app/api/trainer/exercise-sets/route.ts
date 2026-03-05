// app/api/trainer/exercise-sets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const trainer = await requireTrainer();
    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("clientId");

    const db = await getDb();
    const query: any = { trainerId: new ObjectId(trainer._id.toString()) };
    if (clientIdParam && ObjectId.isValid(clientIdParam)) {
      query.$or = [
        { clientId: new ObjectId(clientIdParam) },
        { clientId: { $exists: false } },
      ];
    }

    const sets = await db
      .collection("exercise-sets")
      .find(query)
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ exerciseSets: sets });
  } catch (error) {
    console.error("Error fetching exercise sets:", error);
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

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    if ((trainer as any).type !== "personal") {
      return NextResponse.json({ error: "Only personal trainers can manage exercise sets" }, { status: 403 });
    }

    const body = await req.json();
    const { name, exercises, clientId } = body as {
      name: string;
      exercises: { name: string; defaultSets: number; defaultReps: number; defaultWeight?: number }[];
      clientId?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Set name is required" }, { status: 400 });
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: "At least one exercise is required" }, { status: 400 });
    }

    const db = await getDb();

    // If clientId provided, verify the client belongs to this trainer
    if (clientId && ObjectId.isValid(clientId)) {
      const clientDoc = await db.collection("clients").findOne({
        _id: new ObjectId(clientId),
        trainerId: new ObjectId(trainer._id.toString()),
      });
      if (!clientDoc) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
    }

    const doc: any = {
      trainerId: new ObjectId(trainer._id.toString()),
      name: name.trim(),
      exercises,
      createdAt: new Date(),
    };
    if (clientId && ObjectId.isValid(clientId)) {
      doc.clientId = new ObjectId(clientId);
    }

    const result = await db.collection("exercise-sets").insertOne(doc as any);
    const created = await db.collection("exercise-sets").findOne({ _id: result.insertedId });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating exercise set:", error);
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

export async function PATCH(req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    const body = await req.json();
    const { setId, name, exercises, clientId } = body as {
      setId: string;
      name?: string;
      exercises?: { name: string; defaultSets: number; defaultReps: number; defaultWeight?: number }[];
      clientId?: string;
    };

    if (!setId || !ObjectId.isValid(setId)) {
      return NextResponse.json({ error: "Valid setId is required" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db
      .collection("exercise-sets")
      .findOne({ _id: new ObjectId(setId), trainerId: new ObjectId(trainer._id.toString()) });

    if (!existing) {
      return NextResponse.json({ error: "Exercise set not found" }, { status: 404 });
    }

    const update: any = {};
    if (name !== undefined) update.name = name.trim();
    if (exercises !== undefined) update.exercises = exercises;
    if (clientId !== undefined) {
      if (clientId && ObjectId.isValid(clientId)) {
        update.clientId = new ObjectId(clientId);
      } else {
        // empty string = clear the client assignment (global set)
        await db.collection("exercise-sets").updateOne(
          { _id: new ObjectId(setId) },
          { $unset: { clientId: "" } }
        );
      }
    }

    await db
      .collection("exercise-sets")
      .updateOne({ _id: new ObjectId(setId) }, { $set: update });

    const updated = await db.collection("exercise-sets").findOne({ _id: new ObjectId(setId) });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating exercise set:", error);
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

export async function DELETE(req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    const { searchParams } = new URL(req.url);
    const setId = searchParams.get("setId");

    if (!setId || !ObjectId.isValid(setId)) {
      return NextResponse.json({ error: "Valid setId is required" }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db
      .collection("exercise-sets")
      .findOne({ _id: new ObjectId(setId), trainerId: new ObjectId(trainer._id.toString()) });

    if (!existing) {
      return NextResponse.json({ error: "Exercise set not found" }, { status: 404 });
    }

    await db.collection("exercise-sets").deleteOne({ _id: new ObjectId(setId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting exercise set:", error);
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
