// app/api/admin/dashboard/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const db = await getDb();

    const now = new Date();

    // ─── Trainer counts ───────────────────────────────────────────────────────
    const [activeTrainers, expiredTrainers, deletedTrainers] = await Promise.all([
      db.collection("trainers").countDocuments({
        deletedAt: { $exists: false },
        $or: [{ expirationDate: null }, { expirationDate: { $gte: now.toISOString() } }],
      }),
      db.collection("trainers").countDocuments({
        deletedAt: { $exists: false },
        expirationDate: { $lt: now.toISOString() },
      }),
      db.collection("trainers").countDocuments({
        deletedAt: { $exists: true },
      }),
    ]);

    // ─── Clients ──────────────────────────────────────────────────────────────
    const totalClients = await db
      .collection("clients")
      .countDocuments({ deletedAt: { $exists: false } });

    // ─── Trainer Types ────────────────────────────────────────────────────────
    const trainerTypeAgg = await db
      .collection("trainers")
      .aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: { $ifNull: ["$type", "personal"] }, count: { $sum: 1 } } },
      ])
      .toArray();

    const trainerTypes = trainerTypeAgg.map((t) => ({
      type: t._id as string,
      count: t.count as number,
    }));

    // ─── Expiring soon (next 30 days) ─────────────────────────────────────────
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const expiringSoon = await db
      .collection("trainers")
      .find({
        deletedAt: { $exists: false },
        expirationDate: {
          $gte: now.toISOString(),
          $lte: in30Days.toISOString(),
        },
      })
      .sort({ expirationDate: 1 })
      .limit(5)
      .project({ name: 1, email: 1, expirationDate: 1, type: 1 })
      .toArray();

    // ─── Activity over time (last 30 days, grouped by day) ────────────────────
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityAgg = await db
      .collection("admin-logs")
      .aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Fill in missing days with 0
    const activityMap = new Map(activityAgg.map((a) => [a._id as string, a.count as number]));
    const activityOverTime: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      activityOverTime.push({ date: key, count: activityMap.get(key) ?? 0 });
    }

    // ─── Operation type breakdown ─────────────────────────────────────────────
    const opTypeAgg = await db
      .collection("admin-logs")
      .aggregate([
        { $match: { timestamp: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$operationType", count: { $sum: 1 } } },
      ])
      .toArray();

    const operationBreakdown = opTypeAgg.map((o) => ({
      operation: o._id as string,
      count: o.count as number,
    }));

    // ─── Recent logs ─────────────────────────────────────────────────────────
    const recentLogs = await db
      .collection("admin-logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(8)
      .toArray();

    // Populate admin usernames for recent logs
    const { ObjectId } = await import("mongodb");
    const adminIds = [...new Set(recentLogs.map((l) => l.adminId?.toString()).filter(Boolean))];
    const admins = await db
      .collection("admin")
      .find({ _id: { $in: adminIds.map((id) => new ObjectId(id)) } })
      .project({ username: 1, email: 1 })
      .toArray();
    const adminMap = new Map(admins.map((a) => [a._id.toString(), a]));

    const recentLogsWithAdmin = recentLogs.map((log) => ({
      _id: log._id.toString(),
      operationType: log.operationType,
      affectedCollection: log.affectedCollection,
      timestamp: log.timestamp,
      adminUsername: adminMap.get(log.adminId?.toString())?.username ?? "Unknown",
    }));

    // ─── Clients per trainer distribution (top 5) ─────────────────────────────
    const clientsPerTrainerAgg = await db
      .collection("clients")
      .aggregate([
        { $match: { deletedAt: { $exists: false } } },
        { $group: { _id: "$trainerId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    const trainerIds = clientsPerTrainerAgg.map((c) => {
      try { return new ObjectId(c._id); } catch { return c._id; }
    });

    const trainerNames = await db
      .collection("trainers")
      .find({ _id: { $in: trainerIds } })
      .project({ name: 1 })
      .toArray();

    const trainerNameMap = new Map(trainerNames.map((t) => [t._id.toString(), t.name]));

    const topTrainersByClients = clientsPerTrainerAgg.map((c) => ({
      trainerName: trainerNameMap.get(c._id?.toString()) ?? "Unknown",
      clientCount: c.count as number,
    }));

    return NextResponse.json({
      // Summary counts
      activeTrainers,
      expiredTrainers,
      deletedTrainers,
      totalClients,
      // Charts
      trainerTypes,
      expiringSoon: expiringSoon.map((t) => ({
        name: t.name,
        email: t.email,
        expirationDate: t.expirationDate,
        type: t.type ?? "personal",
      })),
      activityOverTime,
      operationBreakdown,
      topTrainersByClients,
      recentLogs: recentLogsWithAdmin,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
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
