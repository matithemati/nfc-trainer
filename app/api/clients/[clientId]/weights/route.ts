// app/api/clients/[clientId]/weights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { verifyClientOwnership } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    await verifyClientOwnership(clientId);

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const db = await getDb();
    const weights = await db
      .collection("weights")
      .find({ clientId: new ObjectId(clientId) })
      .sort({ date: 1 })
      .toArray();
    return NextResponse.json(weights);
  } catch (error) {
    console.error("Error fetching weights:", error);
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    await verifyClientOwnership(clientId);

    const body = await req.json();
    const { date, weight } = body as { date: string; weight: number };

    const db = await getDb();
    
    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    // Check if weight already exists for this date
    const existing = await db.collection("weights").findOne({ 
      clientId: new ObjectId(clientId), 
      date 
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "Weight entry already exists for this date" },
        { status: 400 }
      );
    }

    const entry = { clientId: new ObjectId(clientId), date, weight };
    await db.collection("weights").insertOne(entry);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating weight:", error);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    await verifyClientOwnership(clientId);

    const body = await req.json();
    const { weightId, date, weight } = body as { 
      weightId: string; 
      date?: string; 
      weight?: number;
    };

    if (!weightId) {
      return NextResponse.json(
        { error: "weightId is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    // If date is being changed, check if another entry exists for the new date
    if (date) {
      const existing = await db.collection("weights").findOne({
        clientId: new ObjectId(clientId),
        date,
        _id: { $ne: new ObjectId(weightId) }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: "Weight entry already exists for this date" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (weight !== undefined) updateData.weight = weight;

    const result = await db.collection("weights").updateOne(
      { _id: new ObjectId(weightId), clientId: new ObjectId(clientId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Weight entry not found" },
        { status: 404 }
      );
    }

    const updated = await db
      .collection("weights")
      .findOne({ _id: new ObjectId(weightId) } as any);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating weight:", error);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);
    await verifyClientOwnership(clientId);

    const { searchParams } = new URL(req.url);
    const weightId = searchParams.get("weightId");

    if (!weightId) {
      return NextResponse.json(
        { error: "weightId is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("weights").deleteOne({
      _id: new ObjectId(weightId),
      clientId: new ObjectId(clientId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Weight entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting weight:", error);
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
