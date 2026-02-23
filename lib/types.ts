// typy pomocnicze (możesz umieścić np. w lib/types.ts)
export type Trainer = {
    _id: string; // UUID trenera = NFC
    name: string;
    email: string;
    maxClients: number;
    isPaid: boolean;
    expirationDate?: string | null; // ISO date string
  };
  
  export type Client = {
    _id: string; // UUID podopiecznego = NFC
    trainerId: string;
    name: string;
    workoutPlan: string;
    dietPlan: string;
  };
  
  export type WorkoutLog = {
    _id?: string;
    clientId: string;
    date: string; // ISO
    exercises: {
      name: string;
      sets: number;
      reps: number;
    }[];
  };
  
  export type WeightLog = {
    _id?: string;
    clientId: string;
    date: string; // ISO
    weight: number;
  };
  