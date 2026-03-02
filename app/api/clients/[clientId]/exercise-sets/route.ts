// app/api/clients/[clientId]/exercise-sets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getStudioClientAndTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    const { trainer } = await getStudioClientAndTrainer(clientId);

    const db = await getDb();
    const sets = await db
      .collection("exercise-sets")
      .find({ trainerId: new ObjectId(trainer._id.toString()) })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({ exerciseSets: sets });
  } catch (error) {
    console.error("Error fetching exercise sets:", error);
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
