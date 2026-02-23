// app/api/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { verifyClientOwnership } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    const { trainer, client } = await verifyClientOwnership(clientId);

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
