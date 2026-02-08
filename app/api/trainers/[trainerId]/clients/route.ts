// app/api/trainers/[trainerId]/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  const { trainerId } = await Promise.resolve(params);
  const db = await getDb();
  const trainer = await db
    .collection("trainers")
    .findOne({ _id: trainerId } as any);

  if (!trainer) {
    return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
  }

  const clients = await db
    .collection("clients")
    .find({ trainerId })
    .toArray();

  return NextResponse.json({ trainer, clients });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  const { trainerId } = await Promise.resolve(params);
  const body = await req.json();
  const { name } = body as { name: string };

  const db = await getDb();
  const trainer = await db
    .collection("trainers")
    .findOne({ _id: trainerId } as any);

  if (!trainer) {
    return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
  }

  const count = await db
    .collection("clients")
    .countDocuments({ trainerId });

  if (count >= trainer.maxClients) {
    return NextResponse.json(
      { error: "Max clients reached" },
      { status: 400 }
    );
  }

  const clientId = crypto.randomUUID();

  const client = {
    _id: clientId,
    trainerId,
    name,
    workoutPlan: "",
    dietPlan: "",
  };

  await db.collection("clients").insertOne(client as any);

  return NextResponse.json(client, { status: 201 });
}
