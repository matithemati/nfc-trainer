"use client";

import { useEffect, useState } from "react";
import React from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMessages } from "@/lib/i18n";
import { cachedFetch, invalidateCachePrefix } from "@/lib/fetch-cache";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WeightChart, DimensionsChart } from "./Charts";
import { TrainerMenuBar } from "./TrainerMenuBar";
import { MembershipStatus } from "./MembershipStatus";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Save,
  Search,
  AlertCircle,
  Mail,
  ShoppingBag,
  User,
  Users,
  Dumbbell,
  Info
} from "lucide-react";

type Trainer = {
  _id: string;
  name: string;
  email: string;
  type?: "personal" | "studio";
  maxClients: number;
  expirationDate?: string | null;
  storeLink?: string;
  storeMessage?: string;
  exerciseNames?: string[];
};

type ExerciseSetExercise = {
  name: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
};

type ExerciseSet = {
  _id?: string;
  clientId?: string;
  name: string;
  exercises: ExerciseSetExercise[];
};

type Client = {
  _id: string;
  trainerId: string;
  name: string;
  workoutPlan: string;
  dietPlan: string;
};

type WorkoutExercise = {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
};

type WorkoutLog = {
  _id?: string;
  clientId: string;
  date: string;
  exercises: WorkoutExercise[];
};

type WeightPoint = { _id?: string; date: string; weight: number };

type DimensionEntry = {
  _id?: string;
  date: string;
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  calf?: number;
};

export function TrainerView({
  lang,
}: {
  lang: string;
}) {
  const { t, lang: currentLang } = getMessages(lang);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState("");
  const [dietPlan, setDietPlan] = useState("");
  const [error, setError] = useState("");
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [editingExercise, setEditingExercise] = useState<{
    logId: string;
    exerciseIndex: number;
    exercise: WorkoutExercise;
  } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [workoutHistoryMonth, setWorkoutHistoryMonth] = useState(new Date().getMonth());
  const [workoutHistoryYear, setWorkoutHistoryYear] = useState(new Date().getFullYear());
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split("T")[0]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [newExercise, setNewExercise] = useState<WorkoutExercise>({
    name: "",
    sets: 3,
    reps: 10,
    weight: undefined,
  });
  const [editingWorkout, setEditingWorkout] = useState<{
    logId: string;
    date: string;
    exercises: WorkoutExercise[];
  } | null>(null);
  const [clientActiveTab, setClientActiveTab] = useState<"plans" | "workouts" | "history" | "progress">("workouts");
  const [progressSubTab, setProgressSubTab] = useState<"weight" | "dimensions">("weight");
  const [clientWeights, setClientWeights] = useState<WeightPoint[]>([]);
  const [clientDimensions, setClientDimensions] = useState<DimensionEntry[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [showAddSet, setShowAddSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetExercises, setNewSetExercises] = useState<ExerciseSetExercise[]>([]);
  const [newSetExercise, setNewSetExercise] = useState<ExerciseSetExercise>({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined });
  const [editingSet, setEditingSet] = useState<(ExerciseSet & { _id: string }) | null>(null);
  const [editingSetExercise, setEditingSetExercise] = useState<ExerciseSetExercise>({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined });
  const [selectedExerciseSetId, setSelectedExerciseSetId] = useState("");
  const [newSetClientId, setNewSetClientId] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [renamingClientId, setRenamingClientId] = useState<string | null>(null);
  const [renameClientName, setRenameClientName] = useState("");
  const [storeLink, setStoreLink] = useState("");
  const [storeMessage, setStoreMessage] = useState("");
  const [storeSettingsSaved, setStoreSettingsSaved] = useState(false);
  const [trainerTab, setTrainerTab] = useState<"clients" | "library" | "account">("clients");
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<string[]>([]);
  const [clientExerciseSets, setClientExerciseSets] = useState<ExerciseSet[]>([]);
  const [clientDimensionsDesc, setClientDimensionsDesc] = useState<DimensionEntry[]>([]);

  const updateWorkoutExercise = (index: number, field: keyof WorkoutExercise, value: number | undefined) => {
    setWorkoutExercises(prev => prev.map((ex, idx) => idx === index ? { ...ex, [field]: value } : ex));
  };

  const updateEditingWorkoutExercise = (index: number, field: keyof WorkoutExercise, value: number | undefined) => {
    setEditingWorkout(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.map((ex, idx) => idx === index ? { ...ex, [field]: value } : ex) };
    });
  };

  const load = async () => {
    try {
      const res = await cachedFetch(`/api/trainer/clients`);

      const text = await res.text();
      if (!text) {
        setError("Empty response from server");
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        setError("Invalid response from server");
        console.error("JSON parse error:", parseError, "Response:", text);
        return;
      }

      if (res.ok) {
        setTrainer(data.trainer);
        setClients(data.clients);
        setAllClients(data.clients);
        setExerciseNames(data.trainer.exerciseNames || []);
        setStoreLink(data.trainer.storeLink || "");
        setStoreMessage(data.trainer.storeMessage || "");
      } else {
        if (res.status === 401) {
          window.location.href = `/${lang}/auth/signin`;
        }
        setError(data.error || "Failed to load trainer");
      }
    } catch (err) {
      setError("Failed to load trainer data");
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced client search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!clientSearchTerm) {
        setClientSearchResults([]);
        return;
      }
      try {
        const res = await cachedFetch(`/api/trainer/clients?search=${encodeURIComponent(clientSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setClientSearchResults(data.clients || []);
        }
      } catch (err) {
        console.error("Failed to search clients:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  // Debounced exercise name search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!exerciseSearchTerm) {
        setExerciseSearchResults([]);
        return;
      }
      try {
        const res = await cachedFetch(`/api/trainer/exercise-names?search=${encodeURIComponent(exerciseSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setExerciseSearchResults(data.exerciseNames || []);
        }
      } catch (err) {
        console.error("Failed to search exercise names:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [exerciseSearchTerm]);

  // Refetch logs when month/year or selected client changes
  useEffect(() => {
    if (!selectedClient) return;
    (async () => {
      try {
        const res = await cachedFetch(
          `/api/clients/${selectedClient._id}/logs?month=${workoutHistoryMonth}&year=${workoutHistoryYear}&order=desc`
        );
        if (res.ok) setWorkoutLogs(await res.json());
      } catch (err) {
        console.error("Failed to load logs for month:", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?._id, workoutHistoryMonth, workoutHistoryYear]);

  const loadExerciseNames = async () => {
    try {
      const res = await cachedFetch(`/api/trainer/exercise-names`);
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
      } else if (res.status === 401) {
        window.location.href = `/${lang}/auth/signin`;
      }
    } catch (err) {
      console.error("Failed to load exercise names:", err);
    }
  };

  const addExerciseName = async () => {
    if (!newExerciseName.trim()) return;
    try {
      const res = await fetch(`/api/trainer/exercise-names`, {
        method: "POST",
        body: JSON.stringify({ exerciseName: newExerciseName }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
        setNewExerciseName("");
        invalidateCachePrefix("/api/trainer/exercise-names");
      } else if (res.status === 401) {
        window.location.href = `/${lang}/auth/signin`;
      }
    } catch (err) {
      console.error("Failed to add exercise name:", err);
    }
  };

  const deleteExerciseName = async (name: string) => {
    try {
      const res = await fetch(`/api/trainer/exercise-names?exerciseName=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
        invalidateCachePrefix("/api/trainer/exercise-names");
      } else if (res.status === 401) {
        window.location.href = `/${lang}/auth/signin`;
      }
    } catch (err) {
      console.error("Failed to delete exercise name:", err);
    }
  };

  useEffect(() => {
    loadExerciseNames();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExerciseSets = async () => {
    try {
      const res = await cachedFetch("/api/trainer/exercise-sets");
      if (res.ok) {
        const data = await res.json();
        setExerciseSets(data.exerciseSets || []);
      } else if (res.status === 401) {
        window.location.href = `/${lang}/auth/signin`;
      }
    } catch (err) {
      console.error("Failed to load exercise sets:", err);
    }
  };

  const createExerciseSet = async () => {
    if (!newSetName.trim() || newSetExercises.length === 0) return;
    try {
      const res = await fetch("/api/trainer/exercise-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSetName.trim(), exercises: newSetExercises, clientId: newSetClientId }),
      });
      if (res.ok) {
        invalidateCachePrefix("/api/trainer/exercise-sets");
        await loadExerciseSets();
        setShowAddSet(false);
        setNewSetName("");
        setNewSetExercises([]);
        setNewSetClientId("");
        setNewSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined });
      }
    } catch (err) {
      console.error("Failed to create exercise set:", err);
    }
  };

  const saveEditedSet = async () => {
    if (!editingSet) return;
    try {
      const res = await fetch("/api/trainer/exercise-sets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: editingSet._id, name: editingSet.name, exercises: editingSet.exercises }),
      });
      if (res.ok) {
        invalidateCachePrefix("/api/trainer/exercise-sets");
        await loadExerciseSets();
        setEditingSet(null);
      }
    } catch (err) {
      console.error("Failed to update exercise set:", err);
    }
  };

  const deleteExerciseSet = async (setId: string) => {
    if (!confirm("Delete this exercise set?")) return;
    try {
      const res = await fetch(`/api/trainer/exercise-sets?setId=${setId}`, { method: "DELETE" });
      if (res.ok) {
        invalidateCachePrefix("/api/trainer/exercise-sets");
        setExerciseSets((prev) => prev.filter((s) => s._id !== setId));
      }
    } catch (err) {
      console.error("Failed to delete exercise set:", err);
    }
  };

  useEffect(() => {
    if (trainer?.type === "personal") {
      loadExerciseSets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainer]);

  const selectClient = async (c: Client) => {
    setSelectedClient(c);
    setWorkoutPlan(c.workoutPlan);
    setDietPlan(c.dietPlan);
    setClientActiveTab("workouts");
    setShowAddWorkout(false);
    setEditingWorkout(null);
    // Logs are fetched by the month-based useEffect when selectedClient changes

    try {
      const wRes = await cachedFetch(`/api/clients/${c._id}/weights`);
      if (wRes.ok) setClientWeights(await wRes.json());
    } catch (err) {
      console.error("Failed to load weights:", err);
    }

    try {
      const [dRes, dDescRes] = await Promise.all([
        cachedFetch(`/api/clients/${c._id}/dimensions`),
        cachedFetch(`/api/clients/${c._id}/dimensions?order=desc`),
      ]);
      if (dRes.ok) setClientDimensions(await dRes.json());
      if (dDescRes.ok) setClientDimensionsDesc(await dDescRes.json());
    } catch (err) {
      console.error("Failed to load dimensions:", err);
    }

    if (trainer?.type === "personal") {
      try {
        const sRes = await cachedFetch(`/api/trainer/exercise-sets?clientId=${c._id}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setClientExerciseSets(sData.exerciseSets || []);
        }
      } catch (err) {
        console.error("Failed to load client exercise sets:", err);
      }
    }

    loadExerciseNames();
  };

  const savePlan = async () => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/clients/${selectedClient._id}`, {
        method: "PATCH",
        body: JSON.stringify({ workoutPlan, dietPlan }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        setError(error.error || t("failedToSavePlan"));
        return;
      }
      const updated = await res.json();
      if (!updated) {
        setError(t("failedToSavePlan"));
        return;
      }
      setSelectedClient(updated);
      setClients((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
      invalidateCachePrefix("/api/trainer/clients");
    } catch (err) {
      setError("Failed to save plan");
      console.error("Save error:", err);
    }
  };

  const updateWorkout = async (logId: string, date: string, exercises: WorkoutExercise[]) => {
    if (!selectedClient) return;
    const res = await fetch(`/api/clients/${selectedClient._id}/logs`, {
      method: "PATCH",
      body: JSON.stringify({ logId, date, exercises }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      await refreshLogs(selectedClient._id, workoutHistoryMonth, workoutHistoryYear);
      setEditingExercise(null);
    }
  };

  const deleteWorkout = async (logId: string) => {
    if (!selectedClient) return;
    if (!confirm("Are you sure you want to delete this workout?")) return;
    const res = await fetch(`/api/clients/${selectedClient._id}/logs?logId=${logId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await refreshLogs(selectedClient._id, workoutHistoryMonth, workoutHistoryYear);
    }
  };

  const deleteExercise = async (logId: string, exerciseIndex: number) => {
    const log = workoutLogs.find((l) => l._id === logId);
    if (!log) return;
    const newExercises = log.exercises.filter((_, idx) => idx !== exerciseIndex);
    if (newExercises.length === 0) {
      deleteWorkout(logId);
    } else {
      await updateWorkout(logId, log.date, newExercises);
    }
  };

  const updateExercise = async (logId: string, exerciseIndex: number, updatedExercise: WorkoutExercise) => {
    const log = workoutLogs.find((l) => l._id === logId);
    if (!log) return;
    const newExercises = [...log.exercises];
    newExercises[exerciseIndex] = updatedExercise;
    await updateWorkout(logId, log.date, newExercises);
    setEditingExercise(null);
  };

  const groupLogsByDay = (logs: WorkoutLog[]) => {
    const grouped: { [key: string]: WorkoutLog[] } = {};
    logs.forEach((log) => {
      const dateKey = log.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    });
    return grouped;
  };

  const refreshLogs = async (clientId: string, month: number, year: number) => {
    try {
      invalidateCachePrefix(`/api/clients/${clientId}/logs`);
      const res = await cachedFetch(`/api/clients/${clientId}/logs?month=${month}&year=${year}&order=desc`);
      if (res.ok) setWorkoutLogs(await res.json());
    } catch (err) {
      console.error("Failed to refresh logs:", err);
    }
  };

  const navigateWorkoutMonth = (direction: number) => {
    const newDate = new Date(workoutHistoryYear, workoutHistoryMonth + direction, 1);
    setWorkoutHistoryMonth(newDate.getMonth());
    setWorkoutHistoryYear(newDate.getFullYear());
  };

  const addExerciseToWorkout = () => {
    if (!newExercise.name) return;
    setWorkoutExercises([...workoutExercises, { ...newExercise }]);
    setNewExercise({ name: "", sets: 3, reps: 10, weight: undefined });
  };

  const removeExerciseFromWorkout = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, idx) => idx !== index));
  };

  const addWorkout = async () => {
    if (!selectedClient || workoutExercises.length === 0) return;
    try {
      const res = await fetch(`/api/clients/${selectedClient._id}/logs`, {
        method: "POST",
        body: JSON.stringify({ date: workoutDate, exercises: workoutExercises }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        await refreshLogs(selectedClient._id, workoutHistoryMonth, workoutHistoryYear);
        setShowAddWorkout(false);
        setWorkoutExercises([]);
        setNewExercise({ name: "", sets: 3, reps: 10, weight: undefined });
        setSelectedExerciseSetId("");
      }
    } catch (err) {
      console.error("Failed to add workout:", err);
    }
  };

  const startEditingWorkout = (log: WorkoutLog) => {
    setEditingWorkout({ logId: log._id!, date: log.date, exercises: [...log.exercises] });
  };

  const cancelEditingWorkout = () => {
    setEditingWorkout(null);
  };

  const addExerciseToEditingWorkout = () => {
    if (!editingWorkout || !newExercise.name) return;
    setEditingWorkout({ ...editingWorkout, exercises: [...editingWorkout.exercises, { ...newExercise }] });
    setNewExercise({ name: "", sets: 3, reps: 10, weight: undefined });
  };

  const removeExerciseFromEditingWorkout = (index: number) => {
    if (!editingWorkout) return;
    setEditingWorkout({
      logId: editingWorkout.logId,
      date: editingWorkout.date,
      exercises: editingWorkout.exercises.filter((_, idx) => idx !== index),
    });
  };

  const saveEditedWorkout = async () => {
    if (!editingWorkout || !selectedClient) return;
    await updateWorkout(editingWorkout.logId, editingWorkout.date, editingWorkout.exercises);
    setEditingWorkout(null);
  };

  const createClient = async () => {
    if (!newClientName.trim()) return;
    try {
      const res = await fetch("/api/trainer/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setClients((prev) => [...prev, data]);
        setAllClients((prev) => [...prev, data]);
        invalidateCachePrefix("/api/trainer/clients");
        setClientSearchTerm("");
        setClientSearchResults([]);
        setNewClientName("");
        setShowAddClient(false);
      } else {
        setError(data.error || t("failedToLoadTrainer"));
      }
    } catch (err) {
      console.error("Failed to create client:", err);
    }
  };

  const renameClient = async (clientId: string, name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setClients((prev) => prev.map((c) => (c._id === clientId ? { ...c, name: updated.name } : c)));
        if (selectedClient?._id === clientId) setSelectedClient((prev) => prev ? { ...prev, name: updated.name } : prev);
        invalidateCachePrefix("/api/trainer/clients");
        invalidateCachePrefix(`/api/clients/${clientId}`);
        setRenamingClientId(null);
        setRenameClientName("");
      }
    } catch (err) {
      console.error("Failed to rename client:", err);
    }
  };

  const saveStoreSettings = async () => {
    try {
      const res = await fetch("/api/trainer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeLink, storeMessage }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTrainer((prev) => prev ? { ...prev, storeLink: updated.storeLink, storeMessage: updated.storeMessage } : prev);
        setStoreSettingsSaved(true);
        setTimeout(() => setStoreSettingsSaved(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save store settings:", err);
    }
  };

  const handleLogout = async () => {
    try {
      setTrainer(null);
      setClients([]);
      await nextAuthSignOut({ redirect: true, callbackUrl: `/${lang}/auth/signin` });
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace(`/${lang}/auth/signin`);
    }
  };

  if (!trainer && !error) return <div>{t("loading")}</div>;

  if (error && !trainer) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!trainer) return null;

  const expirationDate = trainer.expirationDate ? new Date(trainer.expirationDate) : null;
  const isExpired = expirationDate ? expirationDate < new Date() : false;
  const isMembershipActive = !expirationDate || !isExpired;

  if (!isMembershipActive) {
    return (
      <div className="space-y-4">
        <TrainerMenuBar trainer={trainer} clientsCount={clients.length} lang={lang} onLogout={handleLogout} />
        <Card className="w-full border-2 border-destructive/20">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="size-12 text-destructive" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">{t("membershipInactive")}</h2>
                <p className="text-muted-foreground text-base leading-relaxed">{t("contactAdminMessage")}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg border border-border">
                <Mail className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t("contactAdmin")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TrainerMenuBar trainer={trainer} clientsCount={clients.length} lang={lang} onLogout={handleLogout} />

      {/* Top-level tabs */}
      <div className="overflow-x-auto w-full">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["clients", "library", "account"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTrainerTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              trainerTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "clients" ? (
              <><Users className="size-3.5" /><span className="ml-1">{t("clients")}</span></>
            ) : tab === "library" ? (
              <><Dumbbell className="size-3.5" /><span className="ml-1">{t("exercisesTab")}</span></>
            ) : (
              <><User className="size-3.5" /><span className="ml-1">{t("account")}</span></>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* TAB: Clients */}
      {trainerTab === "clients" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Left: Client Roster */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {t("clients")} <span className="text-muted-foreground font-normal">({allClients.length}/{trainer.maxClients})</span>
                </CardTitle>
                {allClients.length < trainer.maxClients && !showAddClient && (
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setShowAddClient(true)}>
                    <Plus className="size-3.5" />
                  </Button>
                )}
              </div>
              {showAddClient && (
                <div className="flex gap-1.5 mt-2">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t("clientNamePlaceholder")}
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createClient();
                      if (e.key === "Escape") { setShowAddClient(false); setNewClientName(""); }
                    }}
                    autoFocus
                  />
                  <Button size="sm" className="h-8 px-2" disabled={!newClientName.trim()} onClick={createClient}><Check className="size-3.5" /></Button>
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => { setShowAddClient(false); setNewClientName(""); }}><X className="size-3.5" /></Button>
                </div>
              )}
              {clients.length > 0 && (
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5" />
                  <Input value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} placeholder={t("searchClients")} className="pl-8 h-8 text-sm" />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-0.5 max-h-[60vh] overflow-y-auto">
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">{t("noClientsYet")}</p>
              ) : (
                (clientSearchTerm ? clientSearchResults : clients)
                  .map((c) => (
                    <div
                      key={c._id}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                        selectedClient?._id === c._id ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                      onClick={() => selectClient(c)}
                    >
                      {renamingClientId === c._id ? (
                        <div className="flex-1 flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={renameClientName}
                            onChange={(e) => setRenameClientName(e.target.value)}
                            className="h-7 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameClient(c._id, renameClientName);
                              if (e.key === "Escape") { setRenamingClientId(null); setRenameClientName(""); }
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => renameClient(c._id, renameClientName)}><Check className="size-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => { setRenamingClientId(null); setRenameClientName(""); }}><X className="size-3" /></Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                            onClick={(e) => { e.stopPropagation(); setRenamingClientId(c._id); setRenameClientName(c.name); }}
                            title={t("renameClient")}
                          >
                            <Pencil className="size-3 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Right: Client Workspace */}
          {!selectedClient ? (
            <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed border-muted">
              <p className="text-muted-foreground text-sm">{t("selectClientToStart")}</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div>
                  <CardTitle>{selectedClient.name}</CardTitle>
                  <a
                    href={`/${lang}/c/${selectedClient._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground font-mono hover:underline hover:text-foreground transition-colors"
                  >
                    {t("nfcId")}: {selectedClient._id}
                  </a>
                </div>
                <div className="overflow-x-auto -mx-2 px-2 pt-2">
                  <div className="flex gap-1 p-1 bg-muted rounded-lg min-w-max">
                    {(["workouts", "history", "progress", "plans"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setClientActiveTab(tab)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                          clientActiveTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab === "workouts" ? t("addWorkout") : tab === "history" ? t("workoutHistory") : tab === "progress" ? t("progress") : `${t("workoutsPlan")} & ${t("dietPlan")}`}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* WORKOUTS TAB */}
                {clientActiveTab === "workouts" && (
                  <div className="space-y-4">
                    {!showAddWorkout && (
                      <Button variant="outline" onClick={() => {
                        setShowAddWorkout(true);
                        setWorkoutDate(new Date().toISOString().split("T")[0]);
                        setWorkoutExercises([]);
                        setNewExercise({ name: "", sets: 3, reps: 10, weight: undefined });
                        loadExerciseNames();
                      }} className="w-full">
                        <Plus className="size-4" />
                        {t("addWorkout")}
                      </Button>
                    )}
                    {showAddWorkout && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Label className="text-sm shrink-0">{t("date")}</Label>
                          <Input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)} className="w-auto" />
                        </div>

                        {trainer.type === "personal" && clientExerciseSets.length > 0 && (
                          <div className="flex items-center gap-3">
                            <Label className="text-sm shrink-0">{t("loadFromExerciseSet")}</Label>
                            <select
                              value={selectedExerciseSetId}
                              onChange={(e) => {
                                setSelectedExerciseSetId(e.target.value);
                                if (e.target.value) {
                                  const set = clientExerciseSets.find((s) => s._id === e.target.value);
                                  if (set) {
                                    setWorkoutExercises(set.exercises.map((ex) => ({
                                      name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight,
                                    })));
                                  }
                                }
                              }}
                              className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                            >
                              <option value="">{t("selectExerciseSet")}</option>
                              {clientExerciseSets.map((s) => (<option key={s._id} value={s._id}>{s.name}</option>))}
                            </select>
                          </div>
                        )}

                        {/* Editable exercise table */}
                        {workoutExercises.length > 0 && (
                          <div className="overflow-x-auto">
                          <div className="space-y-1 min-w-[340px]">
                            <div className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-1.5 px-2 text-xs text-muted-foreground font-medium">
                              <span>{t("exerciseName")}</span>
                              <span className="text-center">{t("sets")}</span>
                              <span className="text-center">{t("reps")}</span>
                              <span className="text-center">{t("weightUnit")}</span>
                              <span />
                            </div>
                            {workoutExercises.map((ex, idx) => (
                              <div key={idx} className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-1.5 items-center">
                                <span className="text-sm px-2 truncate">{ex.name}</span>
                                <Input type="number" value={ex.sets} min={1} onChange={(e) => updateWorkoutExercise(idx, "sets", Number(e.target.value))} className="h-8 text-center px-1 text-sm" />
                                <Input type="number" value={ex.reps} min={1} onChange={(e) => updateWorkoutExercise(idx, "reps", Number(e.target.value))} className="h-8 text-center px-1 text-sm" />
                                <Input type="number" step="0.5" value={ex.weight ?? ""} onChange={(e) => updateWorkoutExercise(idx, "weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className="h-8 text-center px-1 text-sm" />
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeExerciseFromWorkout(idx)}><Trash2 className="size-3.5" /></Button>
                              </div>
                            ))}
                          </div>
                          </div>
                        )}

                        {/* Add exercise */}
                        <div className="border-t pt-3 space-y-2">
                          <Label className="text-sm font-semibold">{t("addExercise")}</Label>
                          <select value={newExercise.name} onChange={(e) => setNewExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                            <option value="">{t("selectExercise")}</option>
                            {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                          </select>
                          {exerciseNames.length === 0 && <p className="text-xs text-muted-foreground">{t("noExerciseNamesHint")}</p>}
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-xs">{t("sets")}</Label><Input type="number" value={newExercise.sets} onChange={(e) => setNewExercise((ex) => ({ ...ex, sets: Number(e.target.value) }))} className="mt-1 h-8" /></div>
                            <div><Label className="text-xs">{t("reps")}</Label><Input type="number" value={newExercise.reps} onChange={(e) => setNewExercise((ex) => ({ ...ex, reps: Number(e.target.value) }))} className="mt-1 h-8" /></div>
                            <div><Label className="text-xs">{t("weight")} <span className="text-muted-foreground">({t("optional")})</span></Label><Input type="number" step="0.5" value={newExercise.weight ?? ""} onChange={(e) => setNewExercise((ex) => ({ ...ex, weight: e.target.value ? Number(e.target.value) : undefined }))} className="mt-1 h-8" /></div>
                          </div>
                          <Button onClick={addExerciseToWorkout} variant="outline" className="w-full" disabled={!newExercise.name}>
                            <Plus className="size-4" />{t("addExercise")}
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={addWorkout} className="flex-1" disabled={workoutExercises.length === 0}>
                            <Save className="size-4" />{t("saveWorkout")}
                          </Button>
                          <Button variant="outline" onClick={() => { setShowAddWorkout(false); setWorkoutExercises([]); setNewExercise({ name: "", sets: 3, reps: 10, weight: undefined }); setSelectedExerciseSetId(""); }}>
                            <X className="size-4" />{t("cancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* HISTORY TAB */}
                {clientActiveTab === "history" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => navigateWorkoutMonth(-1)} title={t("previous")}>
                        <ChevronLeft className="size-4 md:hidden" /><span className="hidden md:inline">{t("previous")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { const today = new Date(); setWorkoutHistoryMonth(today.getMonth()); setWorkoutHistoryYear(today.getFullYear()); }}>
                        <Calendar className="size-4" /><span className="hidden md:inline ml-1">{t("today")}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateWorkoutMonth(1)} title={t("next")}>
                        <ChevronRight className="size-4 md:hidden" /><span className="hidden md:inline">{t("next")}</span>
                      </Button>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { month: "long", year: "numeric" })}
                      </span>
                    </div>
                    {(() => {
                        const groupedLogs = groupLogsByDay(workoutLogs);
                        if (Object.keys(groupedLogs).length === 0) {
                          return (
                            <p className="text-muted-foreground text-sm">
                              {t("noWorkoutsForMonth")} {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", { month: "long", year: "numeric" })}
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {Object.entries(groupedLogs)
                              .map(([date, dayLogs]) => {
                                const isExpanded = expandedDays.has(date);
                                const totalExercises = dayLogs.reduce((sum, log) => sum + (log.exercises?.length || 0), 0);
                                return (
                                  <div key={date} className="space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2">
                                      <div className="font-semibold text-sm">
                                        {new Date(date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                        {" "}({dayLogs.length} {dayLogs.length !== 1 ? t("workouts") : t("workout")}, {totalExercises} {totalExercises !== 1 ? t("exercises") : t("exercise")})
                                      </div>
                                      <Button variant="ghost" size="sm" onClick={() => {
                                        const s = new Set(expandedDays);
                                        if (isExpanded) s.delete(date); else s.add(date);
                                        setExpandedDays(s);
                                      }}>
                                        {isExpanded ? <><ChevronUp className="size-4" />{t("collapse")}</> : <><ChevronDown className="size-4" />{t("expand")}</>}
                                      </Button>
                                    </div>
                                    {isExpanded && (
                                      <div className="space-y-3">
                                        {dayLogs.map((log, logIdx) => (
                                          <div key={log._id || logIdx} className="border rounded-lg p-4 space-y-2">
                                            {editingWorkout?.logId === log._id && editingWorkout ? (
                                              <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                  <Label className="text-sm shrink-0">{t("date")}</Label>
                                                  <Input type="date" value={editingWorkout.date} onChange={(e) => setEditingWorkout({ logId: editingWorkout.logId, date: e.target.value, exercises: editingWorkout.exercises })} className="w-auto" />
                                                </div>
                                                {editingWorkout.exercises.length > 0 && (
                                                  <div className="overflow-x-auto">
                                                  <div className="space-y-1 min-w-[340px]">
                                                    <div className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-1.5 px-2 text-xs text-muted-foreground font-medium">
                                                      <span>{t("exerciseName")}</span>
                                                      <span className="text-center">{t("sets")}</span>
                                                      <span className="text-center">{t("reps")}</span>
                                                      <span className="text-center">{t("weightUnit")}</span>
                                                      <span />
                                                    </div>
                                                    {editingWorkout.exercises.map((ex, idx) => (
                                                      <div key={idx} className="grid grid-cols-[1fr_60px_60px_72px_32px] gap-1.5 items-center">
                                                        <span className="text-sm px-2 truncate">{ex.name}</span>
                                                        <Input type="number" value={ex.sets} min={1} onChange={(e) => updateEditingWorkoutExercise(idx, "sets", Number(e.target.value))} className="h-8 text-center px-1 text-sm" />
                                                        <Input type="number" value={ex.reps} min={1} onChange={(e) => updateEditingWorkoutExercise(idx, "reps", Number(e.target.value))} className="h-8 text-center px-1 text-sm" />
                                                        <Input type="number" step="0.5" value={ex.weight ?? ""} onChange={(e) => updateEditingWorkoutExercise(idx, "weight", e.target.value ? Number(e.target.value) : undefined)} placeholder="—" className="h-8 text-center px-1 text-sm" />
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeExerciseFromEditingWorkout(idx)}><Trash2 className="size-3.5" /></Button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  </div>
                                                )}
                                                <div className="border-t pt-3 space-y-2">
                                                  <Label className="text-sm">{t("addExercise")}</Label>
                                                  <select value={newExercise.name} onChange={(e) => setNewExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                                                    <option value="">{t("selectExercise")}</option>
                                                    {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                                                  </select>
                                                  <div className="grid grid-cols-3 gap-2">
                                                    <Input type="number" value={newExercise.sets} onChange={(e) => setNewExercise((ex) => ({ ...ex, sets: Number(e.target.value) }))} placeholder={t("sets")} className="h-8" />
                                                    <Input type="number" value={newExercise.reps} onChange={(e) => setNewExercise((ex) => ({ ...ex, reps: Number(e.target.value) }))} placeholder={t("reps")} className="h-8" />
                                                    <Input type="number" step="0.5" value={newExercise.weight ?? ""} onChange={(e) => setNewExercise((ex) => ({ ...ex, weight: e.target.value ? Number(e.target.value) : undefined }))} placeholder={t("weightUnit")} className="h-8" />
                                                  </div>
                                                  <Button onClick={addExerciseToEditingWorkout} variant="outline" className="w-full" disabled={!newExercise.name}>
                                                    <Plus className="size-4" />{t("addExercise")}
                                                  </Button>
                                                </div>
                                                <div className="flex gap-2">
                                                  <Button onClick={saveEditedWorkout} className="flex-1" disabled={editingWorkout.exercises.length === 0}><Save className="size-4" />{t("save")}</Button>
                                                  <Button variant="outline" onClick={cancelEditingWorkout}><X className="size-4" />{t("cancel")}</Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex items-center justify-between mb-2">
                                                  <div className="text-sm font-semibold">{t("workoutNumber")}{logIdx + 1}</div>
                                                  <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => startEditingWorkout(log)} title={t("edit")}><Pencil className="size-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteWorkout(log._id!)} title={t("delete")}><Trash2 className="size-4" /></Button>
                                                  </div>
                                                </div>
                                                <div className="space-y-1">
                                                  {log.exercises?.map((ex, exIdx) => (
                                                    <div key={exIdx} className="flex items-center justify-between py-1.5 px-2 rounded border text-sm">
                                                      {editingExercise?.logId === log._id && editingExercise?.exerciseIndex === exIdx ? (
                                                        <div className="flex-1 space-y-2">
                                                          <select value={editingExercise.exercise.name} onChange={(e) => setEditingExercise({ ...editingExercise, exercise: { ...editingExercise.exercise, name: e.target.value } })} className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                                                            <option value="">{t("selectExercise")}</option>
                                                            {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                                                          </select>
                                                          <div className="flex gap-2 items-center flex-wrap">
                                                            <Input type="number" value={editingExercise.exercise.sets} onChange={(e) => setEditingExercise({ ...editingExercise, exercise: { ...editingExercise.exercise, sets: Number(e.target.value) } })} placeholder={t("sets")} className="w-20 h-8" />
                                                            <Input type="number" value={editingExercise.exercise.reps} onChange={(e) => setEditingExercise({ ...editingExercise, exercise: { ...editingExercise.exercise, reps: Number(e.target.value) } })} placeholder={t("reps")} className="w-20 h-8" />
                                                            <Input type="number" step="0.1" value={editingExercise.exercise.weight || ""} onChange={(e) => setEditingExercise({ ...editingExercise, exercise: { ...editingExercise.exercise, weight: e.target.value ? Number(e.target.value) : undefined } })} placeholder={t("exerciseWeight")} className="w-24 h-8" />
                                                            <Button size="sm" onClick={() => updateExercise(log._id!, exIdx, editingExercise.exercise)}><Check className="size-4" />{t("save")}</Button>
                                                            <Button variant="outline" size="sm" onClick={() => setEditingExercise(null)}><X className="size-4" />{t("cancel")}</Button>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <div className="flex-1">
                                                            <span className="font-medium">{ex.name}</span>
                                                            <span className="text-muted-foreground ml-2">{ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}{ex.weight ? ` @ ${ex.weight} ${t("weightUnit")}` : ""}</span>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => setEditingExercise({ logId: log._id!, exerciseIndex: exIdx, exercise: ex })} title={t("edit")}><Pencil className="size-4" /></Button>
                                                            <Button variant="ghost" size="sm" onClick={() => deleteExercise(log._id!, exIdx)} title={t("delete")}><Trash2 className="size-4" /></Button>
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })()
                    }
                  </div>
                )}

                {/* PROGRESS TAB */}
                {clientActiveTab === "progress" && (
                  <div className="space-y-3">
                    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                      {(["weight", "dimensions"] as const).map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setProgressSubTab(sub)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            progressSubTab === sub ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {sub === "weight" ? t("weightTab") : t("dimensions")}
                        </button>
                      ))}
                    </div>
                    {progressSubTab === "weight" && (
                      clientWeights.length > 0
                        ? <WeightChart data={clientWeights} lang={lang} />
                        : <p className="text-muted-foreground text-sm text-center py-8">{t("noWeightData")}</p>
                    )}
                    {progressSubTab === "dimensions" && (
                      clientDimensions.length > 0 ? (
                        <>
                          <DimensionsChart data={clientDimensions} lang={lang} />
                          <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto">
                            {clientDimensionsDesc.map((entry) => (
                              <div key={entry._id || entry.date} className="p-2 border rounded-lg">
                                <div className="text-xs font-medium mb-1">{new Date(entry.date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                  {(["neck", "chest", "waist", "hips", "bicep", "thigh", "calf"] as const).map((field) =>
                                    entry[field] !== undefined ? (
                                      <span key={field}>{t(`dimension${field.charAt(0).toUpperCase() + field.slice(1)}`)}: <span className="font-medium text-foreground">{entry[field]} {t("dimensionsUnit")}</span></span>
                                    ) : null
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-8">{t("noDimensionsData")}</p>
                      )
                    )}
                  </div>
                )}

                {/* PLANS TAB */}
                {clientActiveTab === "plans" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">{t("workoutsPlan")}</Label>
                      <Textarea value={workoutPlan} onChange={(e) => setWorkoutPlan(e.target.value)} rows={4} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">{t("dietPlan")}</Label>
                      <Textarea value={dietPlan} onChange={(e) => setDietPlan(e.target.value)} rows={4} className="mt-1" />
                    </div>
                    <Button size="sm" onClick={savePlan} className="w-full"><Save className="size-4" />{t("save")}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB: Library */}
      {trainerTab === "library" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Exercise Names */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("exerciseNames")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder={t("exerciseNamePlaceholder")} className="flex-1" onKeyDown={(e) => { if (e.key === "Enter") addExerciseName(); }} />
                <Button onClick={addExerciseName} size="sm"><Plus className="size-4" /></Button>
              </div>
              {exerciseNames.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                    <Input value={exerciseSearchTerm} onChange={(e) => setExerciseSearchTerm(e.target.value)} placeholder={t("search")} className="pl-9" />
                  </div>
                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
                    {(exerciseSearchTerm ? exerciseSearchResults : exerciseNames).map((name) => (
                      <div key={name} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{name}</span>
                        <Button variant="ghost" size="sm" onClick={() => deleteExerciseName(name)} title={t("delete")}><Trash2 className="size-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {exerciseNames.length === 0 && <p className="text-muted-foreground text-sm">{t("noExerciseNames")}</p>}
            </CardContent>
          </Card>

          {/* Exercise Sets */}
          {trainer.type === "personal" ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("exerciseSets")}</CardTitle>
                  {!showAddSet && !editingSet && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddSet(true)}><Plus className="size-4" /><span className="ml-1">{t("addSet")}</span></Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {showAddSet && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <div>
                      <Label className="text-sm font-semibold">{t("newExerciseSet")}</Label>
                      <Input value={newSetName} onChange={(e) => setNewSetName(e.target.value)} placeholder={t("exerciseSetNamePlaceholder")} className="mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{t("assignToClient")}</span>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-56 text-xs">{t("assignToClientHint")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <select value={newSetClientId} onChange={(e) => setNewSetClientId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-foreground">
                        <option value="">{t("selectClient")}</option>
                        {clients.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                      </select>
                    </div>
                    {newSetExercises.length > 0 && (
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {newSetExercises.map((ex, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
                            <span>{ex.name} — {ex.defaultSets}×{ex.defaultReps}{ex.defaultWeight ? ` @ ${ex.defaultWeight}${t("weightUnit")}` : ""}</span>
                            <Button variant="ghost" size="sm" onClick={() => setNewSetExercises((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-2 space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("addExerciseToSet")}</Label>
                      <select value={newSetExercise.name} onChange={(e) => setNewSetExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                        <option value="">{t("selectExercise")}</option>
                        {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                      </select>
                      <div className="grid grid-cols-3 gap-2">
                        <Input type="number" value={newSetExercise.defaultSets} onChange={(e) => setNewSetExercise((ex) => ({ ...ex, defaultSets: Number(e.target.value) }))} placeholder={t("sets")} />
                        <Input type="number" value={newSetExercise.defaultReps} onChange={(e) => setNewSetExercise((ex) => ({ ...ex, defaultReps: Number(e.target.value) }))} placeholder={t("reps")} />
                        <Input type="number" step="0.1" value={newSetExercise.defaultWeight || ""} onChange={(e) => setNewSetExercise((ex) => ({ ...ex, defaultWeight: e.target.value ? Number(e.target.value) : undefined }))} placeholder={`${t("weightUnit")} (${t("optional")})`} />
                      </div>
                      <Button size="sm" variant="outline" className="w-full" disabled={!newSetExercise.name.trim()} onClick={() => {
                        if (!newSetExercise.name.trim()) return;
                        setNewSetExercises((prev) => [...prev, { ...newSetExercise }]);
                        setNewSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined });
                      }}>
                        <Plus className="size-4" /><span className="ml-1">{t("addExercise")}</span>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={!newSetName.trim() || newSetExercises.length === 0} onClick={createExerciseSet}>
                        <Save className="size-4" /><span className="ml-1">{t("saveSet")}</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddSet(false); setNewSetName(""); setNewSetExercises([]); setNewSetClientId(""); setNewSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined }); }}>
                        <X className="size-4" /><span className="ml-1">{t("cancel")}</span>
                      </Button>
                    </div>
                  </div>
                )}
                {!showAddSet && exerciseSets.length === 0 && <p className="text-muted-foreground text-sm">{t("noExerciseSets")}</p>}
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {exerciseSets.map((set) => (
                    <div key={set._id} className="border rounded-lg">
                      {editingSet?._id === set._id && editingSet ? (
                        <div className="p-3 space-y-2">
                          <Input value={editingSet.name} onChange={(e) => { const s = editingSet; if (s) setEditingSet({ ...s, name: e.target.value }); }} />
                          <div className="space-y-1 max-h-[120px] overflow-y-auto">
                            {editingSet.exercises.map((ex, idx) => (
                              <div key={idx} className="flex items-center justify-between p-1 border rounded text-sm">
                                <span>{ex.name} — {ex.defaultSets}×{ex.defaultReps}{ex.defaultWeight ? ` @ ${ex.defaultWeight}${t("weightUnit")}` : ""}</span>
                                <Button variant="ghost" size="sm" onClick={() => { const s = editingSet; if (s) setEditingSet({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) }); }}><Trash2 className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">{t("addExercise")}</Label>
                            <select value={editingSetExercise.name} onChange={(e) => setEditingSetExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                              <option value="">{t("selectExercise")}</option>
                              {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                            </select>
                            <div className="grid grid-cols-3 gap-2">
                              <Input type="number" value={editingSetExercise.defaultSets} onChange={(e) => setEditingSetExercise((ex) => ({ ...ex, defaultSets: Number(e.target.value) }))} placeholder={t("sets")} />
                              <Input type="number" value={editingSetExercise.defaultReps} onChange={(e) => setEditingSetExercise((ex) => ({ ...ex, defaultReps: Number(e.target.value) }))} placeholder={t("reps")} />
                              <Input type="number" step="0.1" value={editingSetExercise.defaultWeight || ""} onChange={(e) => setEditingSetExercise((ex) => ({ ...ex, defaultWeight: e.target.value ? Number(e.target.value) : undefined }))} placeholder={t("weightUnit")} />
                            </div>
                            <Button size="sm" variant="outline" className="w-full" disabled={!editingSetExercise.name.trim()} onClick={() => {
                              if (!editingSetExercise.name.trim() || !editingSet) return;
                              const s = editingSet;
                              setEditingSet({ ...s, exercises: [...s.exercises, { ...editingSetExercise }] });
                              setEditingSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined });
                            }}>
                              <Plus className="size-4" /><span className="ml-1">{t("addExercise")}</span>
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" onClick={saveEditedSet}><Save className="size-4" /><span className="ml-1">{t("save")}</span></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSet(null)}><X className="size-4" /><span className="ml-1">{t("cancel")}</span></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium text-sm">{set.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {set.exercises.length} {set.exercises.length !== 1 ? t("exercises") : t("exercise")}
                              {set.clientId && (() => { const c = clients.find((cl) => cl._id === set.clientId); return c ? ` · ${c.name}` : ""; })()}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingSet(set as ExerciseSet & { _id: string }); setEditingSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined }); }}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteExerciseSet(set._id!)}><Trash2 className="size-4" /></Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-sm text-center">{t("exerciseSetsPersonalOnly")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB: Account */}
      {trainerTab === "account" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <MembershipStatus trainer={trainer} clientsCount={clients.length} lang={lang} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingBag className="size-5" />{t("storeSettings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">{t("storeLink")}</Label>
                <Input value={storeLink} onChange={(e) => setStoreLink(e.target.value)} placeholder={t("storeLinkPlaceholder")} className="mt-1" type="url" />
              </div>
              <div>
                <Label className="text-sm">{t("storeMessage")}</Label>
                <Textarea value={storeMessage} onChange={(e) => setStoreMessage(e.target.value)} placeholder={t("storeMessagePlaceholder")} rows={3} className="mt-1" />
              </div>
              <Button onClick={saveStoreSettings} className="w-full">
                {storeSettingsSaved ? <Check className="size-4" /> : <Save className="size-4" />}
                <span className="ml-1">{storeSettingsSaved ? t("storeSettingsSaved") : t("saveStoreSettings")}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
