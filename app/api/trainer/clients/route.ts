// app/api/trainer/clients/route.ts
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
    const search = searchParams.get("search");

    const db = await getDb();
    const query: any = { trainerId: new ObjectId(trainer._id) };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const clients = await db
      .collection("clients")
      .find(query)
      .sort({ name: 1 })
      .toArray();

    const span = Sentry.getActiveSpan();
    if (span) span.setAttribute("clients.count", clients.length);

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
      Sentry.logger.warn(`Max clients limit reached for trainer ${trainer._id} (limit: ${trainer.maxClients})`);
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

    Sentry.logger.info(`Client created by trainer ${trainer._id}: ${name}`);
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
