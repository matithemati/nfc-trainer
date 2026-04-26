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
import { Spinner } from "@/components/ui/spinner";
import { getMessages } from "@/lib/i18n";
import { cachedFetch, invalidateCachePrefix } from "@/lib/fetch-cache";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WeightChart, DimensionsChart, WeightTrendChart } from "./Charts";
import { TrainerMenuBar } from "./TrainerMenuBar";
import { MembershipStatus } from "./MembershipStatus";
import { RpeSelector, RpeBadge } from "./RpeSelector";
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
  defaultSetDetails?: { reps: number; weight?: number }[];
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
  setDetails?: { reps: number; weight?: number }[];
  rpe?: string;
};

type WorkoutLog = {
  _id?: string;
  clientId: string;
  date: string;
  exercises: WorkoutExercise[];
};

const makeSetDetails = (count: number, reps: number, weight?: number) =>
  Array.from({ length: Math.max(1, count) }, () => ({ reps, weight }));

const resizeSetDetails = (
  details: { reps: number; weight?: number }[],
  newCount: number,
  defaultReps: number,
  defaultWeight?: number
): { reps: number; weight?: number }[] => {
  const count = Math.max(1, newCount);
  if (count <= details.length) return details.slice(0, count);
  const last = details[details.length - 1] ?? { reps: defaultReps, weight: defaultWeight };
  return [...details, ...Array.from({ length: count - details.length }, () => ({ ...last }))];
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
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
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
  const [dimChartMonth, setDimChartMonth] = useState(new Date().getMonth());
  const [dimChartYear, setDimChartYear] = useState(new Date().getFullYear());
  const [clientWeights, setClientWeights] = useState<WeightPoint[]>([]);
  const [clientDimensions, setClientDimensions] = useState<DimensionEntry[]>([]);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [showAddSet, setShowAddSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetExercises, setNewSetExercises] = useState<ExerciseSetExercise[]>([]);
  const [newSetExercise, setNewSetExercise] = useState<ExerciseSetExercise>({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined, defaultSetDetails: makeSetDetails(3, 10, undefined) });
  const [editingSet, setEditingSet] = useState<(ExerciseSet & { _id: string }) | null>(null);
  const [editingSetExercise, setEditingSetExercise] = useState<ExerciseSetExercise>({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined, defaultSetDetails: makeSetDetails(3, 10, undefined) });
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
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<string[]>([]);
  const [clientExerciseSets, setClientExerciseSets] = useState<ExerciseSet[]>([]);
  const [clientDimensionsDesc, setClientDimensionsDesc] = useState<DimensionEntry[]>([]);
  const [copied, setCopied] = useState(false);

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

      let data: { trainer: Trainer; clients: Client[]; error?: string };
      try {
        data = JSON.parse(text) as { trainer: Trainer; clients: Client[]; error?: string };
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
          const data = await res.json() as { clients: Client[] };
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
          const data = await res.json() as { exerciseNames: string[] };
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
        if (res.ok) setWorkoutLogs(await res.json() as WorkoutLog[]);
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
        const data = await res.json() as { exerciseNames: string[] };
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
        const data: { exerciseNames: string[] } = await res.json();
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
        const data: { exerciseNames: string[] } = await res.json();
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
        const data = await res.json() as { exerciseSets: ExerciseSet[] };
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
    setMobileShowSidebar(false);
    setWorkoutPlan(c.workoutPlan);
    setDietPlan(c.dietPlan);
    setClientActiveTab("workouts");
    setShowAddWorkout(false);
    setEditingWorkout(null);
    // Logs are fetched by the month-based useEffect when selectedClient changes

    try {
      const wRes = await cachedFetch(`/api/clients/${c._id}/weights`);
      if (wRes.ok) setClientWeights(await wRes.json() as WeightPoint[]);
    } catch (err) {
      console.error("Failed to load weights:", err);
    }

    try {
      const [dRes, dDescRes] = await Promise.all([
        cachedFetch(`/api/clients/${c._id}/dimensions`),
        cachedFetch(`/api/clients/${c._id}/dimensions?order=desc`),
      ]);
      if (dRes.ok) setClientDimensions(await dRes.json() as DimensionEntry[]);
      if (dDescRes.ok) setClientDimensionsDesc(await dDescRes.json() as DimensionEntry[]);
    } catch (err) {
      console.error("Failed to load dimensions:", err);
    }

    if (trainer?.type === "personal") {
      try {
        const sRes = await cachedFetch(`/api/trainer/exercise-sets?clientId=${c._id}`);
        if (sRes.ok) {
          const sData = await sRes.json() as { exerciseSets: ExerciseSet[] };
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
        const error: { error: string } = await res.json();
        setError(error.error || t("failedToSavePlan"));
        return;
      }
      const updated: Client = await res.json();
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
      if (res.ok) setWorkoutLogs(await res.json() as WorkoutLog[]);
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
    setWorkoutExercises([...workoutExercises, {
      ...newExercise,
      setDetails: makeSetDetails(newExercise.sets, newExercise.reps, newExercise.weight),
    }]);
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
    setEditingWorkout({
      logId: log._id!,
      date: log.date,
      exercises: log.exercises.map((ex) => ({
        ...ex,
        setDetails: ex.setDetails ?? makeSetDetails(ex.sets, ex.reps, ex.weight),
      })),
    });
  };

  const cancelEditingWorkout = () => {
    setEditingWorkout(null);
  };

  const addExerciseToEditingWorkout = () => {
    if (!editingWorkout || !newExercise.name) return;
    setEditingWorkout({ ...editingWorkout, exercises: [...editingWorkout.exercises, {
      ...newExercise,
      setDetails: makeSetDetails(newExercise.sets, newExercise.reps, newExercise.weight),
    }] });
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
      if (res.ok) {
        const data: Client = await res.json();
        setClients((prev) => [...prev, data]);
        setAllClients((prev) => [...prev, data]);
        invalidateCachePrefix("/api/trainer/clients");
        setClientSearchTerm("");
        setClientSearchResults([]);
        setNewClientName("");
        setShowAddClient(false);
      } else {
        const errData: { error: string } = await res.json();
        setError(errData.error || t("failedToLoadTrainer"));
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
        const updated: Client = await res.json();
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
        const updated: Pick<Trainer, "storeLink" | "storeMessage"> = await res.json();
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

  if (!trainer && !error) return (
    <div className="h-[100dvh] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );

  if (error && !trainer) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!trainer) return null;

  const expirationDate = trainer.expirationDate ? new Date(trainer.expirationDate) : null;
  const isExpired = expirationDate ? expirationDate < new Date() : false;
  const isMembershipActive = !expirationDate || !isExpired;

  if (!isMembershipActive) {
    return (
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        <TrainerMenuBar trainer={trainer} clientsCount={clients.length} lang={lang} onLogout={handleLogout} activeTab={trainerTab} onTabChange={setTrainerTab} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("membershipInactive")}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{t("contactAdminMessage")}</p>
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-xl border border-border">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">{t("contactAdmin")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <TrainerMenuBar trainer={trainer} clientsCount={clients.length} lang={lang} onLogout={handleLogout} activeTab={trainerTab} onTabChange={setTrainerTab} />

      {/* TAB: Clients */}
      {trainerTab === "clients" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar: Client Roster */}
          <div className={`${mobileShowSidebar ? "flex" : "hidden md:flex"} flex-col w-full md:w-60 shrink-0 border-r border-border bg-card overflow-hidden`}>
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  {t("clients")} · {allClients.length}/{trainer.maxClients}
                </span>
                {allClients.length < trainer.maxClients && !showAddClient && (
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0 rounded-md" onClick={() => setShowAddClient(true)}>
                    <Plus className="size-3" />
                  </Button>
                )}
              </div>
              {showAddClient && (
                <div className="flex gap-1 mb-2">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t("clientNamePlaceholder")}
                    className="flex-1 h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createClient();
                      if (e.key === "Escape") { setShowAddClient(false); setNewClientName(""); }
                    }}
                    autoFocus
                  />
                  <Button size="sm" className="h-7 px-1.5" disabled={!newClientName.trim()} onClick={createClient}><Check className="size-3" /></Button>
                  <Button size="sm" variant="outline" className="h-7 px-1.5" onClick={() => { setShowAddClient(false); setNewClientName(""); }}><X className="size-3" /></Button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3" />
                <Input value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} placeholder={t("searchClients")} className="pl-7 h-7 text-xs" />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-xs py-6 text-center">{t("noClientsYet")}</p>
              ) : (
                (clientSearchTerm ? clientSearchResults : clients).map((c) => (
                  <div
                    key={c._id}
                    className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedClient?._id === c._id ? "bg-primary/10" : "hover:bg-muted/60"
                    }`}
                    onClick={() => selectClient(c)}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    {renamingClientId === c._id ? (
                      <div className="flex-1 flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        <Input value={renameClientName} onChange={(e) => setRenameClientName(e.target.value)} className="h-6 text-xs flex-1" autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameClient(c._id, renameClientName);
                            if (e.key === "Escape") { setRenamingClientId(null); setRenameClientName(""); }
                          }} />
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => renameClient(c._id, renameClientName)}><Check className="size-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => { setRenamingClientId(null); setRenameClientName(""); }}><X className="size-3" /></Button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 text-sm truncate ${selectedClient?._id === c._id ? "font-semibold text-primary" : "font-medium text-foreground"}`}>{c.name}</span>
                        <div className="flex items-center gap-1">
                          {selectedClient?._id === c._id && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                            onClick={(e) => { e.stopPropagation(); setRenamingClientId(c._id); setRenameClientName(c.name); }} title={t("renameClient")}>
                            <Pencil className="size-3 text-muted-foreground" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Client Workspace */}
          <div className={`${mobileShowSidebar ? "hidden md:flex" : "flex"} flex-1 flex-col overflow-hidden`}>
          {!selectedClient ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("selectClientToStart")}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile back button */}
              <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
                <button
                  onClick={() => setMobileShowSidebar(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  {t("clients")}
                </button>
              </div>
              {/* Client header + sub-tabs */}
              {(() => {
                const AVATAR_PALETTE = ["#7c3aed","#0891b2","#059669","#d97706","#dc2626","#db2777","#2563eb"];
                const avatarColor = AVATAR_PALETTE[selectedClient.name.split("").reduce((a,c) => a+c.charCodeAt(0), 0) % AVATAR_PALETTE.length];
                const initials = selectedClient.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0 bg-background border-b border-border shrink-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold"
                          style={{ background: avatarColor + "1a", border: `2px solid ${avatarColor}33`, color: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div>
                          <h2 className="text-xl font-extrabold tracking-tight text-foreground">{selectedClient.name}</h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-muted-foreground font-mono">{t("nfcId")}: {selectedClient._id}</span>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(`/${lang}/c/${selectedClient._id}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                              className="p-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title={t("copyLink")}
                            >
                              {copied ? <Check className="size-3 text-success" /> : <User className="size-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {trainer?.type && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {trainer.type === "personal" ? t("personal") : t("studio")}
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 mb-3">
                      <div className="inline-flex bg-muted/50 rounded-xl p-1 gap-0.5 min-w-full sm:min-w-0">
                        {(["workouts", "history", "progress", "plans"] as const).map((tab) => (
                          <button key={tab} onClick={() => setClientActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                              clientActiveTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}>
                            {tab === "workouts" ? t("logWorkout") : tab === "history" ? t("workoutHistory") : tab === "progress" ? t("progress") : t("plans")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                <div className="max-w-3xl">
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
                                      setDetails: ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight),
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

                        {/* Editable exercise list */}
                        {workoutExercises.length > 0 && (
                          <div className="space-y-2">
                            {workoutExercises.map((ex, idx) => (
                              <div key={idx} className="border rounded p-2 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium flex-1 truncate">{ex.name}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-xs text-muted-foreground leading-none">{t("sets")}:</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={ex.sets}
                                      onChange={(e) => {
                                        const newCount = Math.max(1, Number(e.target.value));
                                        setWorkoutExercises((prev) => prev.map((e2, i) => {
                                          if (i !== idx) return e2;
                                          const details = e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight);
                                          return { ...e2, sets: newCount, setDetails: resizeSetDetails(details, newCount, e2.reps, e2.weight) };
                                        }));
                                      }}
                                      className="h-7 w-14 text-xs text-center px-1"
                                    />
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeExerciseFromWorkout(idx)}><Trash2 className="size-3.5" /></Button>
                                </div>
                                <div className="space-y-1">
                                  {(ex.setDetails ?? makeSetDetails(ex.sets, ex.reps, ex.weight)).map((sd, sIdx) => (
                                    <div key={sIdx} className="grid grid-cols-[48px_1fr_1fr] gap-1.5 items-end">
                                      <span className="text-xs text-muted-foreground pb-1.5">{t("setLabel")} {sIdx + 1}</span>
                                      <div>
                                        {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("reps")}</Label>}
                                        <Input
                                          type="number"
                                          min={1}
                                          value={sd.reps}
                                          onChange={(e) => setWorkoutExercises((prev) => prev.map((e2, i) => {
                                            if (i !== idx) return e2;
                                            const details = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))];
                                            details[sIdx] = { ...details[sIdx], reps: Number(e.target.value) };
                                            return { ...e2, setDetails: details };
                                          }))}
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                      <div>
                                        {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("weightUnit")}</Label>}
                                        <Input
                                          type="number"
                                          step="0.5"
                                          value={sd.weight ?? ""}
                                          onChange={(e) => setWorkoutExercises((prev) => prev.map((e2, i) => {
                                            if (i !== idx) return e2;
                                            const details = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))];
                                            details[sIdx] = { ...details[sIdx], weight: e.target.value ? Number(e.target.value) : undefined };
                                            return { ...e2, setDetails: details };
                                          }))}
                                          className="h-7 text-xs"
                                          placeholder="—"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <RpeSelector
                                  value={ex.rpe}
                                  onChange={(rpe) => setWorkoutExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, rpe } : e2))}
                                  lang={lang}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add exercise */}
                        <div className="border-t pt-3 space-y-2">
                          <Label className="text-sm font-semibold">{t("addExercise")}</Label>
                          <div className="flex gap-2">
                            <select value={newExercise.name} onChange={(e) => setNewExercise((ex) => ({ ...ex, name: e.target.value }))} className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                              <option value="">{t("selectExercise")}</option>
                              {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                            </select>
                            <Button onClick={addExerciseToWorkout} variant="outline" disabled={!newExercise.name} className="shrink-0">
                              <Plus className="size-4" />{t("add")}
                            </Button>
                          </div>
                          {exerciseNames.length === 0 && <p className="text-xs text-muted-foreground">{t("noExerciseNamesHint")}</p>}
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
                    {/* Month nav */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateWorkoutMonth(-1)}
                        className="bg-card border border-border rounded-lg p-1.5 cursor-pointer text-muted-foreground hover:text-foreground flex items-center transition-colors"
                        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="flex-1 text-center font-bold text-sm text-foreground">
                        {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { month: "long", year: "numeric" })}
                      </span>
                      <button
                        onClick={() => navigateWorkoutMonth(1)}
                        className="bg-card border border-border rounded-lg p-1.5 cursor-pointer text-muted-foreground hover:text-foreground flex items-center transition-colors"
                        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                    {(() => {
                      const locale = currentLang === "pl" ? "pl-PL" : "en-US";
                      const groupedLogs = groupLogsByDay(workoutLogs);
                      const days = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));
                      if (days.length === 0) return (
                        <div className="text-center text-sm text-muted-foreground py-12">{t("noWorkoutsForMonth")}</div>
                      );
                      return (
                        <div className="space-y-2">
                          {days.map((date) => {
                            const dayLogs = groupedLogs[date];
                            const isExpanded = expandedDays.has(date);
                            const totalEx = dayLogs.reduce((s, l) => s + (l.exercises?.length || 0), 0);
                            return (
                              <div key={date}>
                                <div
                                  onClick={() => { const s = new Set(expandedDays); s.has(date) ? s.delete(date) : s.add(date); setExpandedDays(s); }}
                                  className="flex items-center px-4 py-3.5 bg-card rounded-xl cursor-pointer border border-border hover:bg-muted/30 transition-colors"
                                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[15px] text-foreground">
                                      {new Date(date + "T12:00:00").toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {totalEx} {totalEx !== 1 ? t("exercises") : t("exercise")} · {dayLogs.length} {dayLogs.length !== 1 ? t("workouts") : t("workout")}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{totalEx} ex</span>
                                    {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="pl-3.5 border-l-2 border-primary/20 ml-4 mt-1 pb-1">
                                    {dayLogs.map((log, li) => (
                                      <div key={log._id || li}>
                                        {editingWorkout?.logId === log._id && editingWorkout ? (
                                          <div className="bg-card rounded-xl p-3.5 mb-1.5 border border-border space-y-3">
                                            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("date")}</div>
                                            <Input type="date" value={editingWorkout.date} onChange={(e) => setEditingWorkout({ logId: editingWorkout!.logId, date: e.target.value, exercises: editingWorkout!.exercises })} className="w-auto" />
                                            {editingWorkout.exercises.length > 0 && (
                                              <div className="space-y-2">
                                                {editingWorkout.exercises.map((ex, idx) => (
                                                  <div key={idx} className="bg-muted rounded-xl p-3 border border-border">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <span className="font-bold text-sm flex-1">{ex.name}</span>
                                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        {t("sets")}:
                                                        <Input type="number" min={1} value={ex.sets} onChange={(e) => { const newCount = Math.max(1, Number(e.target.value)); setEditingWorkout((prev) => { if (!prev) return prev; return { ...prev, exercises: prev.exercises.map((e2, i) => { if (i !== idx) return e2; const details = e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight); return { ...e2, sets: newCount, setDetails: resizeSetDetails(details, newCount, e2.reps, e2.weight) }; })}; }); }} className="h-7 w-14 text-xs text-center px-1" />
                                                      </div>
                                                      <button onClick={() => removeExerciseFromEditingWorkout(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="size-3.5" /></button>
                                                    </div>
                                                    <div className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1">
                                                      <div /><div className="text-[11px] font-bold text-muted-foreground text-center">REPS</div><div className="text-[11px] font-bold text-muted-foreground text-center">KG</div>
                                                    </div>
                                                    {(ex.setDetails ?? makeSetDetails(ex.sets, ex.reps, ex.weight)).map((sd, sIdx) => (
                                                      <div key={sIdx} className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1 items-center">
                                                        <span className="text-[11px] text-muted-foreground text-center font-bold">#{sIdx + 1}</span>
                                                        <Input type="number" min={1} value={sd.reps} onChange={(e) => setEditingWorkout((prev) => { if (!prev) return prev; return { ...prev, exercises: prev.exercises.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], reps: Number(e.target.value) }; return { ...e2, setDetails: d }; })}; })} className="text-center h-8 text-sm" />
                                                        <Input type="number" step="0.5" value={sd.weight ?? ""} placeholder="—" onChange={(e) => setEditingWorkout((prev) => { if (!prev) return prev; return { ...prev, exercises: prev.exercises.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], weight: e.target.value ? Number(e.target.value) : undefined }; return { ...e2, setDetails: d }; })}; })} className="text-center h-8 text-sm" />
                                                      </div>
                                                    ))}
                                                    <div className="mt-2 pt-2 border-t border-border">
                                                      <RpeSelector value={ex.rpe} onChange={(rpe) => setEditingWorkout((prev) => { if (!prev) return prev; return { ...prev, exercises: prev.exercises.map((e2, i) => i === idx ? { ...e2, rpe } : e2) }; })} lang={lang} />
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <div className="border-t pt-2 space-y-2">
                                              <div className="flex gap-2">
                                                <select value={newExercise.name} onChange={(e) => setNewExercise((ex) => ({ ...ex, name: e.target.value }))} className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                                                  <option value="">{t("selectExercise")}</option>
                                                  {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                                                </select>
                                                <Button onClick={addExerciseToEditingWorkout} variant="outline" disabled={!newExercise.name} className="shrink-0"><Plus className="size-4" /></Button>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button size="sm" className="flex-1" disabled={editingWorkout!.exercises.length === 0} onClick={saveEditedWorkout}><Save className="size-3.5" />{t("save")}</Button>
                                              <Button size="sm" variant="outline" onClick={cancelEditingWorkout}><X className="size-3.5" /></Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="flex gap-1 justify-end py-1">
                                              <button onClick={() => startEditingWorkout(log)} className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors"><Pencil className="size-3" /></button>
                                              <button onClick={() => deleteWorkout(log._id!)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 cursor-pointer transition-colors"><Trash2 className="size-3" /></button>
                                            </div>
                                            {log.exercises?.map((ex, ei) => (
                                              <div key={ei} className="bg-card rounded-xl p-3 mb-1.5 border border-border">
                                                <div className="flex items-center gap-2 mb-2.5">
                                                  <span className="font-bold text-sm flex-1">{ex.name}</span>
                                                  {ex.rpe && <RpeBadge value={ex.rpe} />}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {(ex.setDetails || []).map((sd, si) => (
                                                    <span key={si} className="text-xs py-1 px-2.5 rounded-lg bg-muted text-muted-foreground font-semibold border border-border">
                                                      #{si + 1} {sd.reps}{sd.weight ? ` × ${sd.weight}kg` : ""}
                                                    </span>
                                                  ))}
                                                  {!ex.setDetails?.length && (
                                                    <span className="text-xs py-1 px-2.5 rounded-lg bg-muted text-muted-foreground font-semibold border border-border">
                                                      {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ""}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
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
                    })()}
                  </div>
                )}

                {/* PROGRESS TAB */}
                {clientActiveTab === "progress" && (
                  <div className="space-y-3">
                    <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
                      {(["weight", "dimensions"] as const).map((sub) => (
                        <button key={sub} onClick={() => setProgressSubTab(sub)}
                          className={`px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all cursor-pointer ${progressSubTab === sub ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          {sub === "weight" ? t("weightTab") : t("dimensions")}
                        </button>
                      ))}
                    </div>

                    {progressSubTab === "weight" && (() => {
                      if (clientWeights.length === 0) return (
                        <div className="text-center text-sm text-muted-foreground py-12">{t("noWeightData")}</div>
                      );
                      const sorted = [...clientWeights].sort((a, b) => a.date.localeCompare(b.date));
                      const latest = sorted[sorted.length - 1];
                      const prev = sorted.length > 7 ? sorted[sorted.length - 8] : null;
                      const delta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t("currentWeight")}</div>
                              <div className="text-[22px] font-extrabold leading-none tracking-tight text-primary">
                                {latest.weight}<span className="text-xs font-medium text-muted-foreground"> kg</span>
                              </div>
                            </div>
                            <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t("twoWeekChange")}</div>
                              <div className={`text-[22px] font-extrabold leading-none tracking-tight ${delta !== null ? (parseFloat(delta) < 0 ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
                                {delta !== null ? `${parseFloat(delta) > 0 ? "+" : ""}${delta}` : "—"}<span className="text-xs font-medium text-muted-foreground"> kg</span>
                              </div>
                            </div>
                            <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t("totalEntries")}</div>
                              <div className="text-[22px] font-extrabold leading-none tracking-tight text-foreground">{clientWeights.length}</div>
                            </div>
                          </div>
                          <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("weightTrend")}</div>
                            <WeightTrendChart data={clientWeights} lang={lang} />
                          </div>
                        </div>
                      );
                    })()}

                    {progressSubTab === "dimensions" && (
                      clientDimensions.length > 0 ? (
                        <div className="space-y-3">
                          <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <DimensionsChart
                              data={clientDimensions}
                              lang={lang}
                              month={dimChartMonth}
                              year={dimChartYear}
                              onMonthChange={(m, y) => { setDimChartMonth(m); setDimChartYear(y); }}
                            />
                          </div>
                          {clientDimensionsDesc.filter((e) => { const d = new Date(e.date); return d.getMonth() === dimChartMonth && d.getFullYear() === dimChartYear; }).map((entry) => (
                            <div key={entry._id || entry.date} className="bg-card rounded-xl p-3.5 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              <div className="text-xs font-semibold mb-2">{new Date(entry.date + "T12:00:00").toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
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
                      ) : (
                        <div className="text-center text-sm text-muted-foreground py-12">{t("noDimensionsData")}</div>
                      )
                    )}
                  </div>
                )}

                {/* PLANS TAB */}
                {clientActiveTab === "plans" && (
                  <div className="space-y-3">
                    <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("workoutsPlan")}</div>
                      <Textarea value={workoutPlan} onChange={(e) => setWorkoutPlan(e.target.value)} rows={9} placeholder={t("workoutsPlan") + "…"} className="resize-none" />
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("dietPlan")}</div>
                      <Textarea value={dietPlan} onChange={(e) => setDietPlan(e.target.value)} rows={6} placeholder={t("dietPlan") + "…"} className="resize-none" />
                    </div>
                    <Button onClick={savePlan} className="w-full"><Save className="size-4" />{t("save")}</Button>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
          </div>{/* end workspace wrapper */}
        </div>
      )}

      {/* TAB: Library */}
      {trainerTab === "library" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                            <div>
                              <span className="font-medium">{ex.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {ex.defaultSetDetails
                                  ? ex.defaultSetDetails.map((sd, i) => `${t("setLabel")} ${i+1}: ${sd.reps}${sd.weight ? ` @ ${sd.weight}${t("weightUnit")}` : ""}`).join(" · ")
                                  : `${ex.defaultSets}×${ex.defaultReps}${ex.defaultWeight ? ` @ ${ex.defaultWeight}${t("weightUnit")}` : ""}`}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setNewSetExercises((prev) => prev.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-2 space-y-2">
                      <span className="text-xs text-muted-foreground">{t("addExerciseToSet")}</span>
                      <select value={newSetExercise.name} onChange={(e) => setNewSetExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                        <option value="">{t("selectExercise")}</option>
                        {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                      </select>
                      <div className="border rounded p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground leading-none">{t("sets")}:</span>
                          <Input
                            type="number"
                            min={1}
                            value={newSetExercise.defaultSets}
                            onChange={(e) => {
                              const n = Math.max(1, Number(e.target.value));
                              setNewSetExercise((ex) => {
                                const details = ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight);
                                return { ...ex, defaultSets: n, defaultSetDetails: resizeSetDetails(details, n, ex.defaultReps, ex.defaultWeight) };
                              });
                            }}
                            className="h-7 w-14 text-xs text-center px-1"
                          />
                        </div>
                        <div className="space-y-1">
                          {(newSetExercise.defaultSetDetails ?? makeSetDetails(newSetExercise.defaultSets, newSetExercise.defaultReps, newSetExercise.defaultWeight)).map((sd, sIdx) => (
                            <div key={sIdx} className="grid grid-cols-[48px_1fr_1fr] gap-1.5 items-end">
                              <span className="text-xs text-muted-foreground pb-1.5">{t("setLabel")} {sIdx + 1}</span>
                              <div>
                                {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("reps")}</Label>}
                                <Input
                                  type="number"
                                  min={1}
                                  value={sd.reps}
                                  onChange={(e) => setNewSetExercise((ex) => {
                                    const details = [...(ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight))];
                                    details[sIdx] = { ...details[sIdx], reps: Number(e.target.value) };
                                    return { ...ex, defaultSetDetails: details };
                                  })}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("weight")} ({t("optional")})</Label>}
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={sd.weight ?? ""}
                                  onChange={(e) => setNewSetExercise((ex) => {
                                    const details = [...(ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight))];
                                    details[sIdx] = { ...details[sIdx], weight: e.target.value ? Number(e.target.value) : undefined };
                                    return { ...ex, defaultSetDetails: details };
                                  })}
                                  className="h-7 text-xs"
                                  placeholder="kg"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" disabled={!newSetExercise.name.trim()} onClick={() => {
                        if (!newSetExercise.name.trim()) return;
                        setNewSetExercises((prev) => [...prev, { ...newSetExercise }]);
                        setNewSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined, defaultSetDetails: makeSetDetails(3, 10, undefined) });
                      }}>
                        <Plus className="size-4" /><span className="ml-1">{t("addExercise")}</span>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={!newSetName.trim() || newSetExercises.length === 0} onClick={createExerciseSet}>
                        <Save className="size-4" /><span className="ml-1">{t("saveSet")}</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddSet(false); setNewSetName(""); setNewSetExercises([]); setNewSetClientId(""); setNewSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined, defaultSetDetails: makeSetDetails(3, 10, undefined) }); }}>
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
                                <span className="font-medium">{ex.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {ex.defaultSetDetails
                                      ? ex.defaultSetDetails.map((sd, i) => `${t("setLabel")} ${i+1}: ${sd.reps}${sd.weight ? ` @ ${sd.weight}${t("weightUnit")}` : ""}`).join(" · ")
                                      : `${ex.defaultSets}×${ex.defaultReps}${ex.defaultWeight ? ` @ ${ex.defaultWeight}${t("weightUnit")}` : ""}`}
                                  </span>
                                  <Button variant="ghost" size="sm" onClick={() => { const s = editingSet; if (s) setEditingSet({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) }); }}><Trash2 className="size-3" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="border-t pt-2 space-y-2">
                            <span className="text-xs text-muted-foreground">{t("addExerciseToSet")}</span>
                            <select value={editingSetExercise.name} onChange={(e) => setEditingSetExercise((ex) => ({ ...ex, name: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm">
                              <option value="">{t("selectExercise")}</option>
                              {exerciseNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                            </select>
                            <div className="border rounded p-2 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground leading-none">{t("sets")}:</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={editingSetExercise.defaultSets}
                                  onChange={(e) => {
                                    const n = Math.max(1, Number(e.target.value));
                                    setEditingSetExercise((ex) => {
                                      const details = ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight);
                                      return { ...ex, defaultSets: n, defaultSetDetails: resizeSetDetails(details, n, ex.defaultReps, ex.defaultWeight) };
                                    });
                                  }}
                                  className="h-7 w-14 text-xs text-center px-1"
                                />
                              </div>
                              <div className="space-y-1">
                                {(editingSetExercise.defaultSetDetails ?? makeSetDetails(editingSetExercise.defaultSets, editingSetExercise.defaultReps, editingSetExercise.defaultWeight)).map((sd, sIdx) => (
                                  <div key={sIdx} className="grid grid-cols-[48px_1fr_1fr] gap-1.5 items-end">
                                    <span className="text-xs text-muted-foreground pb-1.5">{t("setLabel")} {sIdx + 1}</span>
                                    <div>
                                      {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("reps")}</Label>}
                                      <Input
                                        type="number"
                                        min={1}
                                        value={sd.reps}
                                        onChange={(e) => setEditingSetExercise((ex) => {
                                          const details = [...(ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight))];
                                          details[sIdx] = { ...details[sIdx], reps: Number(e.target.value) };
                                          return { ...ex, defaultSetDetails: details };
                                        })}
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                    <div>
                                      {sIdx === 0 && <Label className="text-xs mb-0.5 block">{t("weight")} ({t("optional")})</Label>}
                                      <Input
                                        type="number"
                                        step="0.1"
                                        value={sd.weight ?? ""}
                                        onChange={(e) => setEditingSetExercise((ex) => {
                                          const details = [...(ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight))];
                                          details[sIdx] = { ...details[sIdx], weight: e.target.value ? Number(e.target.value) : undefined };
                                          return { ...ex, defaultSetDetails: details };
                                        })}
                                        className="h-7 text-xs"
                                        placeholder="kg"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="w-full" disabled={!editingSetExercise.name.trim()} onClick={() => {
                              if (!editingSetExercise.name.trim() || !editingSet) return;
                              const s = editingSet;
                              setEditingSet({ ...s, exercises: [...s.exercises, { ...editingSetExercise }] });
                              setEditingSetExercise({ name: "", defaultSets: 3, defaultReps: 10, defaultWeight: undefined, defaultSetDetails: makeSetDetails(3, 10, undefined) });
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
        </div>
      )}

      {/* TAB: Account */}
      {trainerTab === "account" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
        </div>
      )}
    </div>
  );
}
