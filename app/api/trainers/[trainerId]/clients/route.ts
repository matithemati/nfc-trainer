// app/api/trainers/[trainerId]/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trainerId: string }> | { trainerId: string } }
) {
  try {
    const { trainerId } = await Promise.resolve(params);
    
    // Validate ObjectId format
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

    const clients = await db
      .collection("clients")
      .find({ trainerId: new ObjectId(trainerId) })
      .toArray();

    return NextResponse.json({ trainer, clients });
  } catch (error) {
    console.error("Error fetching trainer:", error);
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
    
    // Validate ObjectId format
    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID format" }, { status: 400 });
    }

    const body = await req.json();
    const { name } = body as { name: string };

    const db = await getDb();
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId) });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const count = await db
      .collection("clients")
      .countDocuments({ trainerId: new ObjectId(trainerId) });

    if (count >= trainer.maxClients) {
      return NextResponse.json(
        { error: "Max clients reached" },
        { status: 400 }
      );
    }

    const clientId = crypto.randomUUID();

    const client = {
      _id: clientId,
      trainerId: new ObjectId(trainerId),
      name,
      workoutPlan: "",
      dietPlan: "",
    };

    await db.collection("clients").insertOne(client as any);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
