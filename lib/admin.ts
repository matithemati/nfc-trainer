// lib/admin.ts
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

export interface AdminLog {
  adminId: ObjectId;
  operationType: "create" | "update" | "delete" | "prolong";
  affectedCollection: "trainers" | "clients";
  affectedId: ObjectId;
  before?: any;
  after?: any;
  metadata: {
    ip?: string;
    userAgent?: string;
  };
  note?: string;
  timestamp: Date;
}

export async function getCurrentAdmin() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return null;
  }

  const db = await getDb();
  const admin = await db
    .collection("admin")
    .findOne({ email: session.user.email, disabled: { $ne: true } });

  return admin;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  
  if (!admin) {
    throw new Error("Unauthorized: Admin access required");
  }

  return admin;
}

export async function logAdminOperation(
  adminId: ObjectId,
  operationType: AdminLog["operationType"],
  affectedCollection: AdminLog["affectedCollection"],
  affectedId: ObjectId,
  options: {
    before?: any;
    after?: any;
    metadata?: { ip?: string; userAgent?: string };
    note?: string;
  } = {}
) {
  const db = await getDb();
  
  const log: AdminLog = {
    adminId,
    operationType,
    affectedCollection,
    affectedId,
    before: options.before,
    after: options.after,
    metadata: options.metadata || {},
    note: options.note,
    timestamp: new Date(),
  };

  await db.collection("admin-logs").insertOne(log);
}

export function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || undefined;
}

export function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get("user-agent") || undefined;
}
