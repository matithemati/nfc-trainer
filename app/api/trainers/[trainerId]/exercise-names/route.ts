// app/api/trainers/[trainerId]/exercise-names/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  try {
    const { trainerId } = await Promise.resolve(params);
    
    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID format" }, { status: 400 });
    }

    const db = await getDb();
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const exerciseNames = (trainer as any).exerciseNames || [];
    return NextResponse.json({ exerciseNames });
  } catch (error) {
    console.error("Error fetching exercise names:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  try {
    const { trainerId } = await Promise.resolve(params);
    
    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID format" }, { status: 400 });
    }

    const body = await req.json();
    const { exerciseName } = body as { exerciseName: string };

    if (!exerciseName || !exerciseName.trim()) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }

    const db = await getDb();
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const exerciseNames = (trainer as any).exerciseNames || [];
    const trimmedName = exerciseName.trim();
    
    if (exerciseNames.includes(trimmedName)) {
      return NextResponse.json({ error: "Exercise name already exists" }, { status: 400 });
    }

    await db.collection("trainers").updateOne(
      { _id: new ObjectId(trainerId) },
      { $push: { exerciseNames: trimmedName } } as any
    );

    const updated = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    return NextResponse.json({ exerciseNames: (updated as any).exerciseNames || [] }, { status: 201 });
  } catch (error) {
    console.error("Error adding exercise name:", error);
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
    const { trainerId } = await Promise.resolve(params);
    
    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const exerciseName = searchParams.get("exerciseName");

    if (!exerciseName) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }

    const db = await getDb();
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    await db.collection("trainers").updateOne(
      { _id: new ObjectId(trainerId) },
      { $pull: { exerciseNames: exerciseName } } as any
    );

    const updated = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    return NextResponse.json({ exerciseNames: (updated as any).exerciseNames || [] });
  } catch (error) {
    console.error("Error deleting exercise name:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
