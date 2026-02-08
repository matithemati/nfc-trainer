// app/api/clients/[clientId]/weights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
  const entry = { clientId, date, weight };
  await db.collection("weights").insertOne(entry);
  return NextResponse.json(entry, { status: 201 });
}
