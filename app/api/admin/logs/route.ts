// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = await getDb();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const adminId = searchParams.get("adminId");
    const operationType = searchParams.get("operationType");
    const affectedCollection = searchParams.get("affectedCollection");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const trainerSearch = searchParams.get("trainerSearch");
    const clientSearch = searchParams.get("clientSearch");

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (adminId && ObjectId.isValid(adminId)) {
      query.adminId = new ObjectId(adminId);
    }

    if (operationType) {
      query.operationType = operationType;
    }

    if (affectedCollection) {
      query.affectedCollection = affectedCollection;
    }

    if (fromDate || toDate) {
      query.timestamp = {};
      if (fromDate) {
        query.timestamp.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.timestamp.$lte = new Date(toDate);
      }
    }

    // Build $or conditions for trainer/client searches
    const searchOrConditions: any[] = [];

    // If searching by trainer, we need to find trainer IDs first
    if (trainerSearch) {
      const trainers = await db
        .collection("trainers")
        .find({
          $or: [
            { name: { $regex: trainerSearch, $options: "i" } },
            { email: { $regex: trainerSearch, $options: "i" } },
          ],
        })
        .toArray();

      const trainerIds = trainers.map((t) => t._id);

      if (trainerIds.length > 0) {
        searchOrConditions.push({
          affectedCollection: "trainers",
          affectedId: { $in: trainerIds },
        });
      }
    }

    // If searching by client, we need to find client IDs first
    if (clientSearch) {
      const clientQuery: any = {
        $or: [
          { name: { $regex: clientSearch, $options: "i" } },
        ],
      };
      
      // If clientSearch is a valid ObjectId, also search by _id
      if (ObjectId.isValid(clientSearch)) {
        clientQuery.$or.push({ _id: new ObjectId(clientSearch) });
      }

      const clients = await db
        .collection("clients")
        .find(clientQuery)
        .toArray();

      const clientIds = clients.map((c) => new ObjectId(c._id));

      if (clientIds.length > 0) {
        searchOrConditions.push({
          affectedCollection: "clients",
          affectedId: { $in: clientIds },
        });
      }
    }

    // If searches were provided but found no results, return empty
    if ((trainerSearch || clientSearch) && searchOrConditions.length === 0) {
      return NextResponse.json({
        logs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Add search conditions to query
    if (searchOrConditions.length > 0) {
      query.$or = [...(query.$or || []), ...searchOrConditions];
    }

    const logs = await db
      .collection("admin-logs")
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("admin-logs").countDocuments(query);

    // Populate admin info
    const adminIds = [...new Set(logs.map((log) => log.adminId))];
    const admins = await db
      .collection("admin")
      .find({ _id: { $in: adminIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const adminMap = new Map(admins.map((a) => [a._id.toString(), a]));

    const logsWithAdmin = logs.map((log) => ({
      ...log,
      admin: adminMap.get(log.adminId.toString()),
    }));

    return NextResponse.json({
      logs: logsWithAdmin,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
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
