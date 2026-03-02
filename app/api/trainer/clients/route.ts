// app/api/trainer/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    const db = await getDb();
    const clients = await db
      .collection("clients")
      .find({ trainerId: new ObjectId(trainer._id) })
      .toArray();

    return NextResponse.json({ trainer, clients });
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

export async function POST(req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    const body = await req.json();
    const { name } = body as { name: string };

    const db = await getDb();

    const count = await db
      .collection("clients")
      .countDocuments({ trainerId: new ObjectId(trainer._id) });

    if (count >= trainer.maxClients) {
      return NextResponse.json(
        { error: "Max clients reached" },
        { status: 400 }
      );
    }

    const clientId = new ObjectId();

    const client = {
      _id: clientId,
      trainerId: new ObjectId(trainer._id),
      name,
      workoutPlan: "",
      dietPlan: "",
    };

    await db.collection("clients").insertOne(client);

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
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
