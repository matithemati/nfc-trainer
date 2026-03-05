// app/api/clients/[clientId]/dimensions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { verifyClientOwnership, getStudioClientAndTrainer } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const { clientId } = await Promise.resolve(params);

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const order = searchParams.get("order") === "desc" ? -1 : 1;

    const db = await getDb();
    const dimensions = await db
      .collection("dimensions")
      .find({ clientId: new ObjectId(clientId) })
      .sort({ date: order })
      .toArray();
    return NextResponse.json(dimensions);
  } catch (error) {
    console.error("Error fetching dimensions:", error);
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

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const body = await req.json();
    const { date, neck, chest, waist, hips, bicep, thigh, calf } = body as {
      date: string;
      neck?: number;
      chest?: number;
      waist?: number;
      hips?: number;
      bicep?: number;
      thigh?: number;
      calf?: number;
    };

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.collection("dimensions").findOne({
      clientId: new ObjectId(clientId),
      date,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Dimensions entry already exists for this date" },
        { status: 400 }
      );
    }

    const entry: any = { clientId: new ObjectId(clientId), date };
    if (neck !== undefined) entry.neck = neck;
    if (chest !== undefined) entry.chest = chest;
    if (waist !== undefined) entry.waist = waist;
    if (hips !== undefined) entry.hips = hips;
    if (bicep !== undefined) entry.bicep = bicep;
    if (thigh !== undefined) entry.thigh = thigh;
    if (calf !== undefined) entry.calf = calf;

    const result = await db.collection("dimensions").insertOne(entry);
    const created = await db.collection("dimensions").findOne({ _id: result.insertedId });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating dimensions:", error);
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

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const body = await req.json();
    const { dimensionId, date, neck, chest, waist, hips, bicep, thigh, calf } = body as {
      dimensionId: string;
      date?: string;
      neck?: number;
      chest?: number;
      waist?: number;
      hips?: number;
      bicep?: number;
      thigh?: number;
      calf?: number;
    };

    if (!dimensionId || !ObjectId.isValid(dimensionId)) {
      return NextResponse.json({ error: "Valid dimensionId is required" }, { status: 400 });
    }

    const db = await getDb();

    if (date) {
      const existing = await db.collection("dimensions").findOne({
        clientId: new ObjectId(clientId),
        date,
        _id: { $ne: new ObjectId(dimensionId) },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Dimensions entry already exists for this date" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = date;
    if (neck !== undefined) updateData.neck = neck;
    if (chest !== undefined) updateData.chest = chest;
    if (waist !== undefined) updateData.waist = waist;
    if (hips !== undefined) updateData.hips = hips;
    if (bicep !== undefined) updateData.bicep = bicep;
    if (thigh !== undefined) updateData.thigh = thigh;
    if (calf !== undefined) updateData.calf = calf;

    const result = await db.collection("dimensions").updateOne(
      { _id: new ObjectId(dimensionId), clientId: new ObjectId(clientId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Dimensions entry not found" }, { status: 404 });
    }

    const updated = await db.collection("dimensions").findOne({ _id: new ObjectId(dimensionId) });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dimensions:", error);
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

    try {
      await verifyClientOwnership(clientId);
    } catch {
      await getStudioClientAndTrainer(clientId);
    }

    if (!ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const dimensionId = searchParams.get("dimensionId");

    if (!dimensionId || !ObjectId.isValid(dimensionId)) {
      return NextResponse.json({ error: "Valid dimensionId is required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("dimensions").deleteOne({
      _id: new ObjectId(dimensionId),
      clientId: new ObjectId(clientId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Dimensions entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dimensions:", error);
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
