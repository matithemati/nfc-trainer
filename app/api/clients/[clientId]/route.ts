// app/api/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { verifyClientOwnership, getStudioClientAndTrainer } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);

    let trainer, client;
    try {
      ({ trainer, client } = await verifyClientOwnership(clientId));
    } catch {
      ({ trainer, client } = await getStudioClientAndTrainer(clientId));
    }

    return NextResponse.json({ client, trainer });
  } catch (error) {
    console.error("Error fetching client:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
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
  try {
    const { clientId } = await Promise.resolve(params);
    await verifyClientOwnership(clientId);

    const db = await getDb();
    const body = await req.json();
    const { workoutPlan, dietPlan, name } = body;

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    await db.collection("clients").updateOne(
      { _id: new ObjectId(clientId) },
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
      .findOne({ _id: new ObjectId(clientId) });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
