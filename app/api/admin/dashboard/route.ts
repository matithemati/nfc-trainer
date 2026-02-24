// app/api/admin/dashboard/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();

    const now = new Date();

    // Active trainers (not deleted, expirationDate is null or in the future)
    const activeTrainers = await db
      .collection("trainers")
      .countDocuments({
        deletedAt: { $exists: false },
        $or: [
          { expirationDate: null },
          { expirationDate: { $gte: now.toISOString() } },
        ],
      });

    // Expired trainers (not deleted, expirationDate is in the past)
    const expiredTrainers = await db
      .collection("trainers")
      .countDocuments({
        deletedAt: { $exists: false },
        expirationDate: { $lt: now.toISOString() },
      });

    // Total clients (not deleted)
    const totalClients = await db
      .collection("clients")
      .countDocuments({
        deletedAt: { $exists: false },
      });

    return NextResponse.json({
      activeTrainers,
      expiredTrainers,
      totalClients,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
