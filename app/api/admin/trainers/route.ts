// app/api/admin/trainers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, logAdminOperation, getClientIp, getUserAgent } from "@/lib/admin";
import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const db = await getDb();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const showDeleted = searchParams.get("showDeleted") === "true";
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (!showDeleted) {
      query.deletedAt = { $exists: false };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const trainers = await db
      .collection("trainers")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("trainers").countDocuments(query);

    return NextResponse.json({
      trainers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching trainers:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    Sentry.captureException(error);
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
    const { name, email, expirationDate, pricePerMonth, type } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await db
      .collection("trainers")
      .findOne({ email, deletedAt: { $exists: false } });
    if (existing) {
      return NextResponse.json({ error: "Email must be unique" }, { status: 400 });
    }

    const now = new Date();
    const trainer = {
      name,
      email,
      type: type === "studio" ? "studio" : "personal",
      maxClients: 10,
      exerciseNames: [],
      expirationDate: expirationDate || null,
      pricePerMonth: pricePerMonth || null,
      createdAt: now,
      updatedAt: now,
      notes: [],
    };

    const result = await db.collection("trainers").insertOne(trainer as any);
    const insertedId = result.insertedId;

    // Log the operation
    await logAdminOperation(
      admin._id as ObjectId,
      "create",
      "trainers",
      insertedId,
      {
        after: trainer,
        metadata: {
          ip: getClientIp(req),
          userAgent: getUserAgent(req),
        },
      }
    );

    const createdTrainer = await db
      .collection("trainers")
      .findOne({ _id: insertedId });

    Sentry.logger.info(Sentry.logger.fmt`Trainer created: ${name} (${email}), type: ${trainer.type}`);
    return NextResponse.json(createdTrainer, { status: 201 });
  } catch (error) {
    console.error("Error creating trainer:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
