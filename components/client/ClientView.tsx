"use client";

import { useEffect, useState } from "react";
import { DimensionsChart, WeightTrendChart } from "./Charts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getMessages } from "@/lib/i18n";
import { cachedFetch, invalidateCachePrefix } from "@/lib/fetch-cache";
import { ClientMenuBar } from "./ClientMenuBar";
import { RpeSelector, RpeBadge } from "./RpeSelector";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Plus,
  ShoppingBag,
  Dumbbell,
  Activity,
  BookOpen,
} from "lucide-react";

type Trainer = {
  _id: string;
  name: string;
  type?: "personal" | "studio";
  maxClients: number;
  expirationDate?: string | null;
  storeLink?: string;
  storeMessage?: string;
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

type WeightPoint = { _id?: string; date: string; weight: number };

type DimensionMeasurements = {
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  calf?: number;
};

type DimensionEntry = { _id?: string; date: string } & DimensionMeasurements;

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

export function ClientView({
  clientId,
  lang,
}: {
  clientId: string;
  lang: string;
}) {
  const { t, lang: currentLang } = getMessages(lang);
  const [client, setClient] = useState<Client | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [weights, setWeights] = useState<WeightPoint[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const [weightDate, setWeightDate] = useState(getTodayDate());
  const [editingWeight, setEditingWeight] = useState<WeightPoint | null>(null);
  const [weightError, setWeightError] = useState("");
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [workoutHistoryMonth, setWorkoutHistoryMonth] = useState(new Date().getMonth());
  const [workoutHistoryYear, setWorkoutHistoryYear] = useState(new Date().getFullYear());
  const [weightHistoryMonth, setWeightHistoryMonth] = useState(new Date().getMonth());
  const [weightHistoryYear, setWeightHistoryYear] = useState(new Date().getFullYear());
  const [showWeightHistory, setShowWeightHistory] = useState(false);

  useEffect(() => {
    // Set weight history to open by default on desktop
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) {
        setShowWeightHistory(true);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  const [activeTab, setActiveTab] = useState<"workouts" | "progress" | "plans">("workouts");
  const [progressSubTab, setProgressSubTab] = useState<"weight" | "dimensions">("weight");
  const [dimChartMonth, setDimChartMonth] = useState(new Date().getMonth());
  const [dimChartYear, setDimChartYear] = useState(new Date().getFullYear());
  const [dimensions, setDimensions] = useState<DimensionEntry[]>([]);
  const [newDimension, setNewDimension] = useState<DimensionMeasurements>({});
  const [dimensionDate, setDimensionDate] = useState(getTodayDate());
  const [editingDimension, setEditingDimension] = useState<DimensionEntry | null>(null);
  const [dimensionError, setDimensionError] = useState("");
  const [showWorkoutPlan, setShowWorkoutPlan] = useState(false);
  const [showDietPlan, setShowDietPlan] = useState(false);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [showSelfLog, setShowSelfLog] = useState(false);
  const [selfLogDate, setSelfLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [selfLogSetId, setSelfLogSetId] = useState("");
  const [selfLogExercises, setSelfLogExercises] = useState<WorkoutExercise[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogDate, setEditingLogDate] = useState("");
  const [editingLogExercises, setEditingLogExercises] = useState<WorkoutExercise[]>([]);
  const [editingLogSetId, setEditingLogSetId] = useState("");
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [weightHistoryData, setWeightHistoryData] = useState<WeightPoint[]>([]);
  const [dimensionHistoryData, setDimensionHistoryData] = useState<DimensionEntry[]>([]);

  useEffect(() => {
    (async () => {
      const res = await cachedFetch(`/api/clients/${clientId}`);
      const data = await res.json() as { client: Client; trainer: Trainer };
      setClient(data.client);
      setTrainer(data.trainer);

      if (data.trainer?.type === "personal") {
        const sRes = await cachedFetch(`/api/clients/${clientId}/exercise-sets`);
        if (sRes.ok) {
          const sData = await sRes.json() as { exerciseSets: ExerciseSet[] };
          setExerciseSets(sData.exerciseSets || []);
        }
        // logs fetched by the month-based useEffect
      }

      const wRes = await cachedFetch(`/api/clients/${clientId}/weights`);
      if (wRes.ok) setWeights(await wRes.json() as WeightPoint[]);

      const [dRes, dDescRes] = await Promise.all([
        cachedFetch(`/api/clients/${clientId}/dimensions`),
        cachedFetch(`/api/clients/${clientId}/dimensions?order=desc`),
      ]);
      if (dRes.ok) setDimensions(await dRes.json() as DimensionEntry[]);
      if (dDescRes.ok) setDimensionHistoryData(await dDescRes.json() as DimensionEntry[]);
      // logs fetched by the month-based useEffect for all trainer types
    })();
  }, [clientId]);

  // Fetch logs when month/year changes (or on mount)
  useEffect(() => {
    (async () => {
      const res = await cachedFetch(
        `/api/clients/${clientId}/logs?month=${workoutHistoryMonth}&year=${workoutHistoryYear}&order=desc`
      );
      if (res.ok) setLogs(await res.json() as WorkoutLog[]);
    })();
  }, [clientId, workoutHistoryMonth, workoutHistoryYear]);

  // Fetch weight history when month/year changes (or on mount)
  useEffect(() => {
    (async () => {
      const res = await cachedFetch(
        `/api/clients/${clientId}/weights?month=${weightHistoryMonth}&year=${weightHistoryYear}&order=desc`
      );
      if (res.ok) setWeightHistoryData(await res.json() as WeightPoint[]);
    })();
  }, [clientId, weightHistoryMonth, weightHistoryYear]);

  const refreshWeights = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/weights`);
    const [wRes, whRes] = await Promise.all([
      cachedFetch(`/api/clients/${clientId}/weights`),
      cachedFetch(`/api/clients/${clientId}/weights?month=${weightHistoryMonth}&year=${weightHistoryYear}&order=desc`),
    ]);
    if (wRes.ok) setWeights(await wRes.json() as WeightPoint[]);
    if (whRes.ok) setWeightHistoryData(await whRes.json() as WeightPoint[]);
  };

  const refreshDimensions = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/dimensions`);
    const [dRes, ddRes] = await Promise.all([
      cachedFetch(`/api/clients/${clientId}/dimensions`),
      cachedFetch(`/api/clients/${clientId}/dimensions?order=desc`),
    ]);
    if (dRes.ok) setDimensions(await dRes.json() as DimensionEntry[]);
    if (ddRes.ok) setDimensionHistoryData(await ddRes.json() as DimensionEntry[]);
  };

  const refreshLogs = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/logs`);
    const res = await cachedFetch(
      `/api/clients/${clientId}/logs?month=${workoutHistoryMonth}&year=${workoutHistoryYear}&order=desc`
    );
    if (res.ok) setLogs(await res.json() as WorkoutLog[]);
  };

  const addWeight = async () => {
    if (!newWeight || !weightDate) return;
    setWeightError("");
    
    // Check if weight already exists for this date
    const existingWeight = weights.find(w => w.date === weightDate);
    if (existingWeight) {
      setWeightError(t("weightAlreadyExists"));
      return;
    }

    const res = await fetch(`/api/clients/${clientId}/weights`, {
      method: "POST",
      body: JSON.stringify({
        date: weightDate,
        weight: parseFloat(newWeight),
      }),
      headers: { "Content-Type": "application/json" },
    });
    
    const data: { error: string } = await res.json();
    if (!res.ok) {
      setWeightError(data.error || t("failedToAddWeight"));
      return;
    }

    await refreshWeights();
    setNewWeight("");
    setWeightDate(getTodayDate());
  };

  const updateWeight = async () => {
    if (!editingWeight || !editingWeight._id) return;
    setWeightError("");
    
    // Check if another weight already exists for this date (excluding the one being edited)
    const existingWeight = weights.find(w => w.date === editingWeight.date && w._id !== editingWeight._id);
    if (existingWeight) {
      setWeightError(t("weightAlreadyExists"));
      return;
    }

    const res = await fetch(`/api/clients/${clientId}/weights`, {
      method: "PATCH",
      body: JSON.stringify({
        weightId: editingWeight._id,
        date: editingWeight.date,
        weight: editingWeight.weight,
      }),
      headers: { "Content-Type": "application/json" },
    });
    
    const data: { error: string } = await res.json();
    if (!res.ok) {
      setWeightError(data.error || t("failedToUpdateWeight"));
      return;
    }

    await refreshWeights();
    setEditingWeight(null);
  };

  const deleteWeight = async (weightId: string) => {
    if (!confirm(t("confirmDeleteWeight"))) return;
    
    const res = await fetch(`/api/clients/${clientId}/weights?weightId=${weightId}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      invalidateCachePrefix(`/api/clients/${clientId}/weights`);
      setWeights((prev) => prev.filter(w => w._id !== weightId));
      setWeightHistoryData((prev) => prev.filter(w => w._id !== weightId));
      if (editingWeight?._id === weightId) {
        setEditingWeight(null);
      }
    }
  };

  const startEditingWeight = (weight: WeightPoint) => {
    setEditingWeight({ ...weight });
    setWeightError("");
  };

  const cancelEditingWeight = () => {
    setEditingWeight(null);
    setWeightError("");
  };

  const addDimension = async () => {
    if (!dimensionDate) return;
    setDimensionError("");
    const existing = dimensions.find((d) => d.date === dimensionDate);
    if (existing) {
      setDimensionError(t("dimensionsAlreadyExist"));
      return;
    }
    const res = await fetch(`/api/clients/${clientId}/dimensions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dimensionDate, ...newDimension }),
    });
    const data: { error: string } = await res.json();
    if (!res.ok) {
      setDimensionError(data.error || t("failedToAddDimensions"));
      return;
    }
    await refreshDimensions();
    setNewDimension({});
    setDimensionDate(getTodayDate());
  };

  const updateDimension = async () => {
    if (!editingDimension?._id) return;
    setDimensionError("");
    const existing = dimensions.find((d) => d.date === editingDimension.date && d._id !== editingDimension._id);
    if (existing) {
      setDimensionError(t("dimensionsAlreadyExist"));
      return;
    }
    const { _id, date, ...measurements } = editingDimension;
    const res = await fetch(`/api/clients/${clientId}/dimensions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dimensionId: _id, date, ...measurements }),
    });
    const data: { error: string } = await res.json();
    if (!res.ok) {
      setDimensionError(data.error || t("failedToUpdateDimensions"));
      return;
    }
    await refreshDimensions();
    setEditingDimension(null);
  };

  const deleteDimension = async (dimensionId: string) => {
    if (!confirm(t("confirmDeleteDimensions"))) return;
    const res = await fetch(`/api/clients/${clientId}/dimensions?dimensionId=${dimensionId}`, { method: "DELETE" });
    if (res.ok) {
      invalidateCachePrefix(`/api/clients/${clientId}/dimensions`);
      setDimensions((prev) => prev.filter((d) => d._id !== dimensionId));
      setDimensionHistoryData((prev) => prev.filter((d) => d._id !== dimensionId));
      if (editingDimension?._id === dimensionId) setEditingDimension(null);
    }
  };

  const submitSelfLog = async () => {
    if (!selfLogDate || selfLogExercises.length === 0) return;
    const res = await fetch(`/api/clients/${clientId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selfLogDate, exercises: selfLogExercises }),
    });
    if (res.ok) {
      await refreshLogs();
      setShowSelfLog(false);
      setSelfLogSetId("");
      setSelfLogExercises([]);
      setSelfLogDate(new Date().toISOString().split("T")[0]);
    }
  };


  const startEditLog = (log: WorkoutLog) => {
    setEditingLogId(log._id!);
    setEditingLogDate(log.date);
    setEditingLogExercises(log.exercises.map((ex) => ({ ...ex })));
    setEditingLogSetId("");
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setEditingLogDate("");
    setEditingLogExercises([]);
    setEditingLogSetId("");
  };

  const saveEditLog = async () => {
    if (!editingLogId || editingLogExercises.length === 0) return;
    const res = await fetch(`/api/clients/${clientId}/logs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: editingLogId, date: editingLogDate, exercises: editingLogExercises }),
    });
    if (res.ok) {
      await refreshLogs();
      cancelEditLog();
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm(t("confirmDeleteWorkout"))) return;
    const res = await fetch(`/api/clients/${clientId}/logs?logId=${logId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      invalidateCachePrefix(`/api/clients/${clientId}/logs`);
      setLogs((prev) => prev.filter((l) => l._id !== logId));
    }
  };

  const groupLogsByDay = (logs: WorkoutLog[]) => {
    const grouped: { [key: string]: WorkoutLog[] } = {};
    logs.forEach((log) => {
      const dateKey = log.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    return grouped;
  };

  const navigateWorkoutMonth = (direction: number) => {
    const newDate = new Date(workoutHistoryYear, workoutHistoryMonth + direction, 1);
    setWorkoutHistoryMonth(newDate.getMonth());
    setWorkoutHistoryYear(newDate.getFullYear());
  };

  const navigateWeightMonth = (direction: number) => {
    const newDate = new Date(weightHistoryYear, weightHistoryMonth + direction, 1);
    setWeightHistoryMonth(newDate.getMonth());
    setWeightHistoryYear(newDate.getFullYear());
  };

  if (!client) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );

  // Check if trainer's membership is active
  const expirationDate = trainer?.expirationDate 
    ? new Date(trainer.expirationDate)
    : null;
  
  const isExpired = expirationDate 
    ? expirationDate < new Date()
    : false;
  
  // Membership is active if expirationDate is null (no expiration) or in the future
  const isMembershipActive = trainer ? (!trainer.expirationDate || !isExpired) : false;

  // If membership is not active, show blocking message and hide all data
  if (trainer && !isMembershipActive) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <ClientMenuBar lang={lang} trainerName={trainer?.name} clientName={client?.name} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">
                {t("trainerMembershipExpired")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("trainerMembershipExpiredMessage")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const AVATAR_PALETTE = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#2563eb"];
  const avatarColor = AVATAR_PALETTE[client.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length];
  const locale = currentLang === "pl" ? "pl-PL" : "en-US";

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Top bar */}
      <ClientMenuBar lang={lang} trainerName={trainer?.name} clientName={client.name} />

      {/* Client header */}
      <div className="bg-card border-b border-border px-5 pt-3.5 pb-3 shrink-0" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold"
            style={{ background: avatarColor + "1a", border: `2px solid ${avatarColor}33`, color: avatarColor }}
          >
            {getInitials(client.name)}
          </div>
          <div>
            <div className="font-extrabold text-[19px] leading-tight tracking-tight text-foreground">{client.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {trainer?.type === "personal" ? "Personal Training" : trainer?.type === "studio" ? "Studio" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Promo banner */}
      {trainer && (trainer.storeLink || trainer.storeMessage) && (
        <div className="shrink-0 border-b border-primary/20 bg-primary/5">
          {trainer.storeMessage && trainer.storeLink ? (
            <a href={trainer.storeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-5 py-2.5 text-sm no-underline">
              <ShoppingBag className="size-3.5 shrink-0 text-primary" />
              <span className="text-foreground/80 hover:text-primary transition-colors">{trainer.storeMessage}</span>
            </a>
          ) : trainer.storeMessage ? (
            <div className="flex items-center gap-2.5 px-5 py-2.5 text-sm">
              <ShoppingBag className="size-3.5 shrink-0 text-primary" />
              <span className="text-foreground/80">{trainer.storeMessage}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab navigation */}
      <div className="bg-card border-b border-border px-4 py-3 shrink-0">
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
          <div className="inline-flex bg-muted/50 rounded-xl p-1 gap-0.5 min-w-full sm:min-w-0">
            {([
              { id: "workouts", label: t("history"), icon: <Dumbbell className="size-3.5" /> },
              { id: "progress", label: t("progress"), icon: <Activity className="size-3.5" /> },
              { id: "plans", label: t("plans"), icon: <BookOpen className="size-3.5" /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[460px] mx-auto px-4 pt-4 pb-8 space-y-3">

          {/* ── WORKOUTS TAB ───────────────────────────────────────── */}
          {activeTab === "workouts" && (
            <div className="space-y-3">
              {/* Log workout button */}
              {trainer?.type === "personal" && (
                <button
                  onClick={() => { setShowSelfLog(true); setSelfLogDate(new Date().toISOString().split("T")[0]); setSelfLogSetId(""); setSelfLogExercises([]); }}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
                  style={{ boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}
                >
                  <Plus className="size-4" />{t("logMyWorkout")}
                </button>
              )}

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
                  {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(locale, { month: "long", year: "numeric" })}
                </span>
                <button
                  onClick={() => navigateWorkoutMonth(1)}
                  className="bg-card border border-border rounded-lg p-1.5 cursor-pointer text-muted-foreground hover:text-foreground flex items-center transition-colors"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Day log cards */}
              {(() => {
                const grouped = groupLogsByDay(logs);
                const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                if (days.length === 0) return (
                  <div className="text-center text-sm text-muted-foreground py-12">{t("noWorkoutHistory")}</div>
                );
                return (
                  <div className="space-y-2">
                    {days.map((date) => {
                      const dayLogs = grouped[date];
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
                                {totalEx} {totalEx !== 1 ? t("exercises") : t("exercise")}
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
                                  {trainer?.type === "personal" && log._id && editingLogId !== log._id && (
                                    <div className="flex gap-1 justify-end py-1">
                                      <button onClick={() => startEditLog(log)} className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer transition-colors"><Pencil className="size-3" /></button>
                                      <button onClick={() => deleteLog(log._id!)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 cursor-pointer transition-colors"><Trash2 className="size-3" /></button>
                                    </div>
                                  )}
                                  {editingLogId === log._id ? (
                                    <div className="bg-card rounded-xl p-3.5 mb-1.5 border border-border space-y-3">
                                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("date")}</div>
                                      <Input type="date" value={editingLogDate} onChange={(e) => setEditingLogDate(e.target.value)} />
                                      {exerciseSets.length > 0 && (
                                        <div>
                                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("exerciseSetLabel")}</div>
                                          <select value={editingLogSetId} onChange={(e) => { setEditingLogSetId(e.target.value); if (e.target.value) { const set = exerciseSets.find((s) => s._id === e.target.value); if (set) setEditingLogExercises(set.exercises.map((ex) => ({ name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight, setDetails: ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight) }))); } }} className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                                            <option value="">{t("loadFromExerciseSet")}</option>
                                            {exerciseSets.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                          </select>
                                        </div>
                                      )}
                                      <div className="space-y-2 max-h-[240px] overflow-y-auto">
                                        {editingLogExercises.map((ex, idx) => (
                                          <div key={idx} className="bg-muted rounded-xl p-3 border border-border">
                                            <div className="font-bold text-sm mb-2">{ex.name}</div>
                                            <div className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1">
                                              <div /><div className="text-[11px] font-bold text-muted-foreground text-center">REPS</div><div className="text-[11px] font-bold text-muted-foreground text-center">KG</div>
                                            </div>
                                            {(ex.setDetails ?? makeSetDetails(ex.sets, ex.reps, ex.weight)).map((sd, sIdx) => (
                                              <div key={sIdx} className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1 items-center">
                                                <span className="text-[11px] text-muted-foreground text-center font-bold">#{sIdx + 1}</span>
                                                <Input type="number" value={sd.reps} onChange={(e) => { const newCount = Math.max(1, Number(e.target.value)); setEditingLogExercises((prev) => prev.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], reps: newCount }; return { ...e2, setDetails: d }; })); }} className="text-center h-8 text-sm" />
                                                <Input type="number" value={sd.weight ?? ""} step="0.5" placeholder="—" onChange={(e) => setEditingLogExercises((prev) => prev.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], weight: e.target.value ? Number(e.target.value) : undefined }; return { ...e2, setDetails: d }; }))} className="text-center h-8 text-sm" />
                                              </div>
                                            ))}
                                            <div className="mt-2 pt-2 border-t border-border">
                                              <RpeSelector value={ex.rpe} onChange={(rpe) => setEditingLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, rpe } : e2))} lang={lang} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" className="flex-1" disabled={editingLogExercises.length === 0} onClick={saveEditLog}><Save className="size-3.5" />{t("save")}</Button>
                                        <Button size="sm" variant="outline" onClick={cancelEditLog}><X className="size-3.5" /></Button>
                                      </div>
                                    </div>
                                  ) : (
                                    log.exercises?.map((ex, ei) => (
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
                                          {(!ex.setDetails?.length) && (
                                            <span className="text-xs py-1 px-2.5 rounded-lg bg-muted text-muted-foreground font-semibold border border-border">
                                              {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ""}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
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

          {/* ── PROGRESS TAB ───────────────────────────────────────── */}
          {activeTab === "progress" && (
            <div className="space-y-3">
              {/* Sub-tabs */}
              <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
                {(["weight", "dimensions"] as const).map((sub) => (
                  <button key={sub} onClick={() => setProgressSubTab(sub)} className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${progressSubTab === sub ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {sub === "weight" ? t("weightTab") : t("dimensions")}
                  </button>
                ))}
              </div>

              {progressSubTab === "weight" && (
                <div className="space-y-3">
                  {/* Stat cards */}
                  {weights.length > 0 && (() => {
                    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
                    const latest = sorted[sorted.length - 1];
                    const prev = sorted.length > 7 ? sorted[sorted.length - 8] : null;
                    const delta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
                    return (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t("currentWeight")}</div>
                          <div className="text-[28px] font-extrabold leading-none tracking-tight text-primary">
                            {latest.weight}<span className="text-sm font-medium text-muted-foreground"> kg</span>
                          </div>
                        </div>
                        {delta !== null && (
                          <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t("twoWeekChange")}</div>
                            <div className={`text-[28px] font-extrabold leading-none tracking-tight ${parseFloat(delta) < 0 ? "text-success" : "text-destructive"}`}>
                              {parseFloat(delta) > 0 ? "+" : ""}{delta}<span className="text-sm font-medium text-muted-foreground"> kg</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Trend chart */}
                  <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("weightTrend")}</div>
                    <WeightTrendChart data={weights} lang={lang} />
                  </div>

                  {/* Log weight */}
                  <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {editingWeight ? t("editWeight") : t("logWeight")}
                    </div>
                    {weightError && <div className="text-xs text-destructive mb-2">{weightError}</div>}
                    <div className="flex gap-2">
                      <Input type="date" value={editingWeight ? editingWeight.date : weightDate} onChange={(e) => { editingWeight ? setEditingWeight({ ...editingWeight, date: e.target.value }) : setWeightDate(e.target.value); setWeightError(""); }} className="flex-none w-auto" />
                      <Input type="number" step="0.1" value={editingWeight ? editingWeight.weight.toString() : newWeight} onChange={(e) => { editingWeight ? setEditingWeight({ ...editingWeight, weight: parseFloat(e.target.value) || 0 }) : setNewWeight(e.target.value); setWeightError(""); }} placeholder="kg" className="flex-1" />
                      {editingWeight ? (
                        <>
                          <button onClick={updateWeight} className="bg-primary text-primary-foreground rounded-lg px-4 text-sm font-bold cursor-pointer whitespace-nowrap">{t("save")}</button>
                          <button onClick={cancelEditingWeight} className="bg-muted border border-border rounded-lg px-3 text-muted-foreground cursor-pointer flex items-center"><X className="size-4" /></button>
                        </>
                      ) : (
                        <button onClick={addWeight} className="bg-primary text-primary-foreground rounded-lg px-4 text-sm font-bold cursor-pointer">+</button>
                      )}
                    </div>
                  </div>

                  {/* Weight history */}
                  {weightHistoryData.length > 0 && (
                    <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <button onClick={() => setShowWeightHistory(!showWeightHistory)} className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("weightHistory")}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); navigateWeightMonth(-1); }} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-3.5" /></button>
                            <span className="text-xs text-muted-foreground">{new Date(weightHistoryYear, weightHistoryMonth, 1).toLocaleDateString(locale, { month: "short", year: "numeric" })}</span>
                            <button onClick={(e) => { e.stopPropagation(); navigateWeightMonth(1); }} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronRight className="size-3.5" /></button>
                          </div>
                        </div>
                        {showWeightHistory ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                      </button>
                      {showWeightHistory && (
                        <div className="divide-y divide-border max-h-60 overflow-y-auto">
                          {weightHistoryData.map((w) => (
                            <div key={w._id || w.date} className="flex items-center px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold">{w.weight} kg</div>
                                <div className="text-xs text-muted-foreground">{new Date(w.date + "T12:00:00").toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => startEditingWeight(w)} disabled={!!editingWeight} className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer disabled:opacity-40 transition-colors"><Pencil className="size-3" /></button>
                                <button onClick={() => deleteWeight(w._id!)} disabled={!!editingWeight} className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 cursor-pointer disabled:opacity-40 transition-colors"><Trash2 className="size-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {progressSubTab === "dimensions" && (
                <div className="space-y-3">
                  {/* Dimensions form */}
                  <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {editingDimension ? t("editDimensions") : t("addDimensions")}
                    </div>
                    {dimensionError && <div className="text-xs text-destructive mb-2">{dimensionError}</div>}
                    <div className="space-y-3">
                      <Input type="date" value={editingDimension ? editingDimension.date : dimensionDate} onChange={(e) => { editingDimension ? setEditingDimension({ ...editingDimension, date: e.target.value }) : setDimensionDate(e.target.value); setDimensionError(""); }} />
                      <div className="grid grid-cols-2 gap-2">
                        {(["neck", "chest", "waist", "hips", "bicep", "thigh", "calf"] as const).map((field) => (
                          <div key={field}>
                            <Label className="text-xs">{t(`dimension${field.charAt(0).toUpperCase() + field.slice(1)}`)} ({t("dimensionsUnit")})</Label>
                            <Input type="number" step="0.1" placeholder="—" value={editingDimension ? (editingDimension[field] ?? "") : (newDimension[field] ?? "")} onChange={(e) => { const val = e.target.value ? parseFloat(e.target.value) : undefined; editingDimension ? setEditingDimension({ ...editingDimension, [field]: val }) : setNewDimension((prev) => ({ ...prev, [field]: val })); }} className="mt-1 h-9" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {editingDimension ? (
                          <>
                            <Button onClick={updateDimension} className="flex-1"><Save className="size-4" />{t("save")}</Button>
                            <Button onClick={() => { setEditingDimension(null); setDimensionError(""); }} variant="outline"><X className="size-4" /></Button>
                          </>
                        ) : (
                          <Button onClick={addDimension} className="w-full"><Save className="size-4" />{t("saveDimensions")}</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions chart */}
                  {dimensions.length > 0 && (
                    <div className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <DimensionsChart data={dimensions} lang={lang} month={dimChartMonth} year={dimChartYear} onMonthChange={(m, y) => { setDimChartMonth(m); setDimChartYear(y); }} />
                    </div>
                  )}

                  {/* Dimensions history */}
                  {(() => {
                    const historyEntries = dimensionHistoryData.filter((e) => { const d = new Date(e.date); return d.getMonth() === dimChartMonth && d.getFullYear() === dimChartYear; });
                    if (historyEntries.length === 0) return null;
                    return (
                      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                        <div className="px-4 py-3 border-b border-border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{t("dimensionsHistory")}</span>
                        </div>
                        <div className="divide-y divide-border max-h-72 overflow-y-auto">
                          {historyEntries.map((entry) => (
                            <div key={entry._id || entry.date} className="p-3.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="font-semibold text-sm">{new Date(entry.date + "T12:00:00").toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingDimension({ ...entry }); setDimensionError(""); }} disabled={!!editingDimension} className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer disabled:opacity-40 transition-colors"><Pencil className="size-3" /></button>
                                  <button onClick={() => deleteDimension(entry._id!)} disabled={!!editingDimension} className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 cursor-pointer disabled:opacity-40 transition-colors"><Trash2 className="size-3" /></button>
                                </div>
                              </div>
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
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── PLANS TAB ──────────────────────────────────────────── */}
          {activeTab === "plans" && (
            <div className="space-y-3">
              {[
                { label: t("workoutsPlan"), content: client.workoutPlan },
                { label: t("dietPlan"), content: client.dietPlan },
              ].map(({ label, content }) => (
                <div key={label} className="bg-card rounded-xl p-4 border border-border" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{label}</div>
                  <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "inherit" }}>
                    {content || t("noContent")}
                  </pre>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── LOG WORKOUT BOTTOM SHEET ───────────────────────────────── */}
      {showSelfLog && (
        <div
          className="fixed inset-0 bg-black/45 z-50 flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSelfLog(false); setSelfLogSetId(""); setSelfLogExercises([]); } }}
        >
          <div className="bg-card rounded-t-[20px] w-full max-w-[480px] max-h-[92vh] overflow-y-auto pb-5" style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="px-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[17px] font-extrabold tracking-tight">{t("logMyWorkout")}</span>
                <button onClick={() => { setShowSelfLog(false); setSelfLogSetId(""); setSelfLogExercises([]); }} className="bg-muted border border-border rounded-lg p-1.5 cursor-pointer text-muted-foreground flex items-center">
                  <X className="size-4" />
                </button>
              </div>

              <div className="mb-3">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("date")}</div>
                <Input type="date" value={selfLogDate} onChange={(e) => setSelfLogDate(e.target.value)} />
              </div>

              {exerciseSets.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("exerciseSetLabel")}</div>
                  <select
                    value={selfLogSetId}
                    onChange={(e) => {
                      setSelfLogSetId(e.target.value);
                      if (e.target.value) {
                        const set = exerciseSets.find((s) => s._id === e.target.value);
                        if (set) setSelfLogExercises(set.exercises.map((ex) => ({
                          name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps, weight: ex.defaultWeight,
                          setDetails: ex.defaultSetDetails ?? makeSetDetails(ex.defaultSets, ex.defaultReps, ex.defaultWeight),
                        })));
                      } else setSelfLogExercises([]);
                    }}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none"
                  >
                    <option value="">{t("selectExerciseSet")}</option>
                    {exerciseSets.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {selfLogExercises.length > 0 && (
                <div className="flex flex-col gap-2.5 mb-4">
                  {selfLogExercises.map((ex, idx) => (
                    <div key={idx} className="bg-muted rounded-xl p-3.5 border border-border">
                      <div className="font-bold text-sm mb-2.5">{ex.name}</div>
                      <div className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1.5">
                        <div />
                        <div className="text-[11px] font-bold text-muted-foreground text-center">REPS</div>
                        <div className="text-[11px] font-bold text-muted-foreground text-center">KG</div>
                      </div>
                      {(ex.setDetails ?? makeSetDetails(ex.sets, ex.reps, ex.weight)).map((sd, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-[28px_1fr_1fr] gap-1.5 mb-1.5 items-center">
                          <span className="text-[11px] text-muted-foreground text-center font-bold">#{sIdx + 1}</span>
                          <Input type="number" value={sd.reps || ""} onChange={(e) => setSelfLogExercises((prev) => prev.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], reps: Number(e.target.value) }; return { ...e2, setDetails: d }; }))} className="text-center h-9" />
                          <Input type="number" value={sd.weight ?? ""} step="0.5" placeholder="—" onChange={(e) => setSelfLogExercises((prev) => prev.map((e2, i) => { if (i !== idx) return e2; const d = [...(e2.setDetails ?? makeSetDetails(e2.sets, e2.reps, e2.weight))]; d[sIdx] = { ...d[sIdx], weight: e.target.value ? Number(e.target.value) : undefined }; return { ...e2, setDetails: d }; }))} className="text-center h-9" />
                        </div>
                      ))}
                      <div className="mt-3 pt-2.5 border-t border-border">
                        <RpeSelector value={ex.rpe} onChange={(rpe) => setSelfLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, rpe } : e2))} lang={lang} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={submitSelfLog}
                disabled={selfLogExercises.length === 0}
                className={`w-full rounded-xl py-4 text-[15px] font-bold flex items-center justify-center gap-2 transition-opacity ${selfLogExercises.length > 0 ? "bg-primary text-primary-foreground cursor-pointer hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
              >
                <Save className="size-4" />{t("saveWorkout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
