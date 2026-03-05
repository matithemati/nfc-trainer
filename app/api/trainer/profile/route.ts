// app/api/trainer/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    const trainer = await requireTrainer();

    const body = await req.json();
    const { storeLink, storeMessage } = body as {
      storeLink?: string;
      storeMessage?: string;
    };

    const update: any = {};
    if (storeLink !== undefined) update.storeLink = storeLink.trim();
    if (storeMessage !== undefined) update.storeMessage = storeMessage.trim();

    const db = await getDb();
    await db.collection("trainers").updateOne(
      { _id: new ObjectId(trainer._id.toString()) },
      { $set: update }
    );

    const updated = await db.collection("trainers").findOne({ _id: new ObjectId(trainer._id.toString()) });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating trainer profile:", error);
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
