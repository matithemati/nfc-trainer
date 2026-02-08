// app/api/clients/[clientId]/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const db = await getDb();
  const logs = await db
    .collection("workouts")
    .find({ clientId })
    .sort({ date: 1 })
    .toArray();
  return NextResponse.json(logs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const body = await req.json();
  const { date, exercises } = body as {
    date: string;
    exercises: { name: string; sets: number; reps: number }[];
  };

  const db = await getDb();
  const log = { clientId, date, exercises };
  const result = await db.collection("workouts").insertOne(log);
  const inserted = await db
    .collection("workouts")
    .findOne({ _id: result.insertedId });
  return NextResponse.json(inserted, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const body = await req.json();
  const { logId, date, exercises } = body as {
    logId: string;
    date?: string;
    exercises?: { name: string; sets: number; reps: number }[];
  };

  if (!logId) {
    return NextResponse.json({ error: "logId is required" }, { status: 400 });
  }

  const db = await getDb();
  const updateData: any = {};
  if (date !== undefined) updateData.date = date;
  if (exercises !== undefined) updateData.exercises = exercises;

  const result = await db.collection("workouts").updateOne(
    { _id: new ObjectId(logId), clientId } as any,
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Workout log not found" }, { status: 404 });
  }

  const updated = await db
    .collection("workouts")
    .findOne({ _id: new ObjectId(logId) } as any);

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const { searchParams } = new URL(req.url);
  const logId = searchParams.get("logId");

  if (!logId) {
    return NextResponse.json({ error: "logId is required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("workouts").deleteOne({
    _id: new ObjectId(logId),
    clientId,
  } as any);

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Workout log not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
