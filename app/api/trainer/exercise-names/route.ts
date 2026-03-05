// app/api/trainer/exercise-names/route.ts
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
    const search = searchParams.get("search")?.toLowerCase();

    const db = await getDb();
    const updatedTrainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainer._id) });

    if (!updatedTrainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    let exerciseNames: string[] = (updatedTrainer as any).exerciseNames || [];
    if (search) {
      exerciseNames = exerciseNames.filter((n: string) => n.toLowerCase().includes(search));
    }
    return NextResponse.json({ exerciseNames });
  } catch (error) {
    console.error("Error fetching exercise names:", error);
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

    const body = await req.json();
    const { exerciseName } = body as { exerciseName: string };

    if (!exerciseName || !exerciseName.trim()) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }

    const db = await getDb();
    const updatedTrainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainer._id) });

    if (!updatedTrainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const exerciseNames = (updatedTrainer as any).exerciseNames || [];
    const trimmedName = exerciseName.trim();
    
    if (exerciseNames.includes(trimmedName)) {
      return NextResponse.json({ error: "Exercise name already exists" }, { status: 400 });
    }

    await db.collection("trainers").updateOne(
      { _id: new ObjectId(trainer._id) },
      { $push: { exerciseNames: trimmedName } } as any
    );

    const updated = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainer._id) });

    return NextResponse.json({ exerciseNames: (updated as any).exerciseNames || [] }, { status: 201 });
  } catch (error) {
    console.error("Error adding exercise name:", error);
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
    const exerciseName = searchParams.get("exerciseName");

    if (!exerciseName) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }

    const db = await getDb();
    const updatedTrainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainer._id) });

    if (!updatedTrainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    await db.collection("trainers").updateOne(
      { _id: new ObjectId(trainer._id) },
      { $pull: { exerciseNames: exerciseName } } as any
    );

    const updated = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainer._id) });

    return NextResponse.json({ exerciseNames: (updated as any).exerciseNames || [] });
  } catch (error) {
    console.error("Error deleting exercise name:", error);
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
