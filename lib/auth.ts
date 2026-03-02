// lib/auth.ts
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function getCurrentTrainer() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return null;
  }

  const db = await getDb();
  const trainer = await db
    .collection("trainers")
    .findOne({ email: session.user.email });

  return trainer;
}

export async function requireTrainer() {
  const trainer = await getCurrentTrainer();
  
  if (!trainer) {
    throw new Error("Unauthorized: Trainer not found");
  }

  return trainer;
}

export async function verifyClientOwnership(clientId: string) {
  const trainer = await requireTrainer();
  const db = await getDb();

  // Validate ObjectId format
  if (!ObjectId.isValid(clientId)) {
    throw new Error("Invalid client ID format");
  }

  const client = await db
    .collection("clients")
    .findOne({ _id: new ObjectId(clientId) });

  if (!client) {
    throw new Error("Client not found");
  }

  // Check if client belongs to trainer
  if (client.trainerId.toString() !== trainer._id.toString()) {
    throw new Error("Unauthorized: Client does not belong to trainer");
  }

  return { trainer, client };
}

export async function getStudioClientAndTrainer(clientId: string) {
  if (!ObjectId.isValid(clientId)) {
    throw new Error("Invalid client ID format");
  }

  const db = await getDb();

  const client = await db
    .collection("clients")
    .findOne({ _id: new ObjectId(clientId) });

  if (!client) {
    throw new Error("Client not found");
  }

  const trainer = await db
    .collection("trainers")
    .findOne({ _id: new ObjectId(client.trainerId.toString()) });

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  if (trainer.type !== "studio") {
    throw new Error("Unauthorized: Not a studio trainer");
  }

  return { client, trainer };
}
