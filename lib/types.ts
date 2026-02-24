// typy pomocnicze (możesz umieścić np. w lib/types.ts)
import { ObjectId } from "mongodb";

export type Trainer = {
    _id: ObjectId | string;
    name: string;
    email: string;
    maxClients: number;
    expirationDate?: string | null; // ISO date string
    pricePerMonth?: number;
    createdAt?: Date;
    updatedAt?: Date;
    notes?: Array<{
      timestamp: Date;
      adminId: ObjectId | string;
      note: string;
    }>;
    deletedAt?: Date | null;
    deletedBy?: ObjectId | string | null;
  };
  
  export type Client = {
    _id: ObjectId | string;
    trainerId: ObjectId | string;
    name: string;
    workoutPlan: string;
    dietPlan: string;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
    deletedBy?: ObjectId | string | null;
  };
  
  export type WorkoutLog = {
    _id?: ObjectId | string;
    clientId: ObjectId | string;
    date: string; // ISO
    exercises: {
      name: string;
      sets: number;
      reps: number;
    }[];
  };
  
  export type WeightLog = {
    _id?: ObjectId | string;
    clientId: ObjectId | string;
    date: string; // ISO
    weight: number;
  };

  export type Admin = {
    _id: ObjectId | string;
    username: string;
    email: string;
    disabled: boolean;
  };

  export type AdminLog = {
    _id?: ObjectId | string;
    adminId: ObjectId | string;
    operationType: "create" | "update" | "delete" | "prolong";
    affectedCollection: "trainers" | "clients";
    affectedId: ObjectId | string;
    before?: any;
    after?: any;
    metadata: {
      ip?: string;
      userAgent?: string;
    };
    note?: string;
    timestamp: Date;
  };
  