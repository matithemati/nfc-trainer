// app/api/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    const db = await getDb();
    const client = await db
      .collection("clients")
      .findOne({ _id: clientId } as any);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Validate ObjectId format before querying
    if (!ObjectId.isValid(client.trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID format" }, { status: 400 });
    }

    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(client.trainerId) });

    return NextResponse.json({ client, trainer });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const db = await getDb();
  const body = await req.json();
  const { workoutPlan, dietPlan, name } = body;

  await db.collection("clients").updateOne(
    { _id: clientId } as any,
    {
      $set: {
        ...(name ? { name } : {}),
        ...(workoutPlan !== undefined ? { workoutPlan } : {}),
        ...(dietPlan !== undefined ? { dietPlan } : {}),
      },
    }
  );

  const client = await db
    .collection("clients")
    .findOne({ _id: clientId } as any);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}
