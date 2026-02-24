// app/api/admin/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdminOperation, getClientIp, getUserAgent } from "@/lib/admin";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const showDeleted = searchParams.get("showDeleted") === "true";
    const trainerId = searchParams.get("trainerId");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (!showDeleted) {
      query.deletedAt = { $exists: false };
    }
    if (trainerId && ObjectId.isValid(trainerId)) {
      query.trainerId = new ObjectId(trainerId);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        ...(ObjectId.isValid(search) ? [{ _id: new ObjectId(search) }] : []),
      ];
    }

    const clients = await db
      .collection("clients")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("clients").countDocuments(query);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();

    const body = await req.json();
    const { name, trainerId, uuid } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!trainerId) {
      return NextResponse.json({ error: "Trainer ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID" }, { status: 400 });
    }

    // Verify trainer exists
    const trainer = await db
      .collection("trainers")
      .findOne({ _id: new ObjectId(trainerId), deletedAt: { $exists: false } });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const now = new Date();
    const clientId = new ObjectId();

    const client = {
      _id: clientId,
      trainerId: new ObjectId(trainerId),
      name,
      workoutPlan: "",
      dietPlan: "",
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("clients").insertOne(client);

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "create",
      "clients",
      clientId,
      {
        after: client,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      }
    );

    const createdClient = await db
      .collection("clients")
      .findOne({ _id: clientId });

    return NextResponse.json(createdClient, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
