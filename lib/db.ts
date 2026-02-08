// lib/db.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb() {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri as string);
    await client.connect();
  }
  db = client.db();
  return db;
}
