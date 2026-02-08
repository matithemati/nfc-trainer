// app/api/trainers/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const trainers = await db.collection("trainers").find({}).toArray();
  return NextResponse.json(trainers);
}
