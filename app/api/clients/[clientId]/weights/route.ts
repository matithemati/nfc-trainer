// app/api/clients/[clientId]/weights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const db = await getDb();
  const weights = await db
    .collection("weights")
    .find({ clientId })
    .sort({ date: 1 })
    .toArray();
  return NextResponse.json(weights);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const body = await req.json();
  const { date, weight } = body as { date: string; weight: number };

  const db = await getDb();
  
  // Check if weight already exists for this date
  const existing = await db.collection("weights").findOne({ 
    clientId, 
    date 
  });
  
  if (existing) {
    return NextResponse.json(
      { error: "Weight entry already exists for this date" },
      { status: 400 }
    );
  }

  const entry = { clientId, date, weight };
  await db.collection("weights").insertOne(entry);
  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
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
  
  // If date is being changed, check if another entry exists for the new date
  if (date) {
    const existing = await db.collection("weights").findOne({
      clientId,
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
    { _id: new ObjectId(weightId), clientId } as any,
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
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  const { clientId } = await Promise.resolve(params);
  const { searchParams } = new URL(req.url);
  const weightId = searchParams.get("weightId");

  if (!weightId) {
    return NextResponse.json(
      { error: "weightId is required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const result = await db.collection("weights").deleteOne({
    _id: new ObjectId(weightId),
    clientId
  } as any);

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { error: "Weight entry not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
