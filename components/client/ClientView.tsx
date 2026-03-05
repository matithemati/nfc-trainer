"use client";

import { useEffect, useState } from "react";
import { WeightChart, DimensionsChart } from "./Charts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMessages } from "@/lib/i18n";
import { cachedFetch, invalidateCachePrefix } from "@/lib/fetch-cache";
import { ClientMenuBar } from "./ClientMenuBar";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Plus,
  ShoppingBag,
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
};

type WorkoutLog = {
  _id?: string;
  clientId: string;
  date: string;
  exercises: WorkoutExercise[];
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
  const [weightHistoryData, setWeightHistoryData] = useState<WeightPoint[]>([]);
  const [dimensionHistoryData, setDimensionHistoryData] = useState<DimensionEntry[]>([]);

  useEffect(() => {
    (async () => {
      const res = await cachedFetch(`/api/clients/${clientId}`);
      const data = await res.json();
      setClient(data.client);
      setTrainer(data.trainer);

      if (data.trainer?.type === "personal") {
        const sRes = await cachedFetch(`/api/clients/${clientId}/exercise-sets`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setExerciseSets(sData.exerciseSets || []);
        }
        // logs fetched by the month-based useEffect
      }

      const wRes = await cachedFetch(`/api/clients/${clientId}/weights`);
      if (wRes.ok) setWeights(await wRes.json());

      const [dRes, dDescRes] = await Promise.all([
        cachedFetch(`/api/clients/${clientId}/dimensions`),
        cachedFetch(`/api/clients/${clientId}/dimensions?order=desc`),
      ]);
      if (dRes.ok) setDimensions(await dRes.json());
      if (dDescRes.ok) setDimensionHistoryData(await dDescRes.json());
      // logs fetched by the month-based useEffect for all trainer types
    })();
  }, [clientId]);

  // Fetch logs when month/year changes (or on mount)
  useEffect(() => {
    (async () => {
      const res = await cachedFetch(
        `/api/clients/${clientId}/logs?month=${workoutHistoryMonth}&year=${workoutHistoryYear}&order=desc`
      );
      if (res.ok) setLogs(await res.json());
    })();
  }, [clientId, workoutHistoryMonth, workoutHistoryYear]);

  // Fetch weight history when month/year changes (or on mount)
  useEffect(() => {
    (async () => {
      const res = await cachedFetch(
        `/api/clients/${clientId}/weights?month=${weightHistoryMonth}&year=${weightHistoryYear}&order=desc`
      );
      if (res.ok) setWeightHistoryData(await res.json());
    })();
  }, [clientId, weightHistoryMonth, weightHistoryYear]);

  const refreshWeights = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/weights`);
    const [wRes, whRes] = await Promise.all([
      cachedFetch(`/api/clients/${clientId}/weights`),
      cachedFetch(`/api/clients/${clientId}/weights?month=${weightHistoryMonth}&year=${weightHistoryYear}&order=desc`),
    ]);
    if (wRes.ok) setWeights(await wRes.json());
    if (whRes.ok) setWeightHistoryData(await whRes.json());
  };

  const refreshDimensions = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/dimensions`);
    const [dRes, ddRes] = await Promise.all([
      cachedFetch(`/api/clients/${clientId}/dimensions`),
      cachedFetch(`/api/clients/${clientId}/dimensions?order=desc`),
    ]);
    if (dRes.ok) setDimensions(await dRes.json());
    if (ddRes.ok) setDimensionHistoryData(await ddRes.json());
  };

  const refreshLogs = async () => {
    invalidateCachePrefix(`/api/clients/${clientId}/logs`);
    const res = await cachedFetch(
      `/api/clients/${clientId}/logs?month=${workoutHistoryMonth}&year=${workoutHistoryYear}&order=desc`
    );
    if (res.ok) setLogs(await res.json());
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
    
    const data = await res.json();
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
    
    const data = await res.json();
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
    const data = await res.json();
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
    const data = await res.json();
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

  if (!client) return <div>{t("loading")}</div>;

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
      <div className="space-y-4">
        <ClientMenuBar lang={lang} />
        <Card className="w-full border-2 border-destructive/20">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="size-12 text-destructive" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("trainerMembershipExpired")}
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {t("trainerMembershipExpiredMessage")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ClientMenuBar lang={lang} />

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {client.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("clientHeader")}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Store / Promo banner */}
      {trainer && (trainer.storeLink || trainer.storeMessage) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/40 text-sm">
          <ShoppingBag className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            {trainer.storeMessage && trainer.storeLink ? (
              <a
                href={trainer.storeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/80 leading-snug hover:text-primary hover:underline transition-colors"
              >
                {trainer.storeMessage}
              </a>
            ) : trainer.storeMessage ? (
              <p className="text-foreground/80 leading-snug">{trainer.storeMessage}</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 border-b bg-card min-w-max rounded-t-xl">
          <button
            onClick={() => setActiveTab("workouts")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === "workouts"
                ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t("workoutHistory")}
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === "progress"
                ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t("progress")}
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
              activeTab === "plans"
                ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t("workoutsPlan")} & {t("dietPlan")}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "workouts" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("workoutHistory")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWorkoutMonth(-1)}
                  title={t("previous")}
                >
                  <ChevronLeft className="size-4 md:hidden" />
                  <span className="hidden md:inline">{t("previous")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setWorkoutHistoryMonth(today.getMonth());
                    setWorkoutHistoryYear(today.getFullYear());
                  }}
                  title={t("today")}
                >
                  <Calendar className="size-4" />
                  <span className="hidden md:inline">{t("today")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWorkoutMonth(1)}
                  title={t("next")}
                >
                  <ChevronRight className="size-4 md:hidden" />
                  <span className="hidden md:inline">{t("next")}</span>
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </CardHeader>
          <CardContent>
            {trainer?.type === "personal" && (
              <div className="mb-4">
                {!showSelfLog ? (
                  <Button variant="outline" className="w-full" onClick={() => {
                    setShowSelfLog(true);
                    setSelfLogDate(new Date().toISOString().split("T")[0]);
                    setSelfLogSetId("");
                    setSelfLogExercises([]);
                  }}>
                    <Plus className="size-4 mr-2" />
                    {t("logMyWorkout")}
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <div>
                      <Label className="text-sm font-semibold">{t("logMyWorkout")}</Label>
                    </div>
                    <div>
                      <Label className="text-sm">{t("date")}</Label>
                      <Input type="date" value={selfLogDate} onChange={(e) => setSelfLogDate(e.target.value)} className="mt-1" />
                    </div>
                    {exerciseSets.length > 0 && (
                      <div>
                        <Label className="text-sm">{t("exerciseSetLabel")}</Label>
                        <select
                          value={selfLogSetId}
                          onChange={(e) => {
                            setSelfLogSetId(e.target.value);
                            if (e.target.value) {
                              const set = exerciseSets.find((s) => s._id === e.target.value);
                              if (set) {
                                setSelfLogExercises(set.exercises.map((ex) => ({
                                  name: ex.name,
                                  sets: ex.defaultSets,
                                  reps: ex.defaultReps,
                                  weight: ex.defaultWeight,
                                })));
                              }
                            } else {
                              setSelfLogExercises([]);
                            }
                          }}
                          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                        >
                          <option value="">{t("selectExerciseSet")}</option>
                          {exerciseSets.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {selfLogExercises.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t("exercises")}</Label>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
                          {selfLogExercises.map((ex, idx) => (
                            <div key={idx} className="border rounded p-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{ex.name}</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelfLogExercises((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">{t("sets")}</Label>
                                  <Input
                                    type="number"
                                    value={ex.sets}
                                    onChange={(e) => setSelfLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, sets: Number(e.target.value) } : e2))}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t("reps")}</Label>
                                  <Input
                                    type="number"
                                    value={ex.reps}
                                    onChange={(e) => setSelfLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, reps: Number(e.target.value) } : e2))}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t("weight")} ({t("optional")})</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={ex.weight || ""}
                                    onChange={(e) => setSelfLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, weight: e.target.value ? Number(e.target.value) : undefined } : e2))}
                                    className="h-8 text-sm"
                                    placeholder="kg"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button className="flex-1" disabled={selfLogExercises.length === 0} onClick={submitSelfLog}>
                        <Save className="size-4 mr-2" />
                        {t("saveWorkout")}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowSelfLog(false); setSelfLogSetId(""); setSelfLogExercises([]); }}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {logs.length === 0 ? (
              <p className="text-muted-foreground">{t("noWorkoutHistory")}</p>
            ) : (
              (() => {
                const groupedLogs = groupLogsByDay(logs);

                if (Object.keys(groupedLogs).length === 0) {
                  return (
                    <p className="text-muted-foreground">
                      {t("noWorkoutsForMonth")} {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  );
                }

                return (
                  <div className="space-y-6">
                    {Object.entries(groupedLogs)
                      .map(([date, dayLogs]) => {
                        const isExpanded = expandedDays.has(date);
                        const totalExercises = dayLogs.reduce((sum, log) => sum + (log.exercises?.length || 0), 0);
                        return (
                          <div key={date} className="space-y-3">
                            <div 
                              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                const newExpanded = new Set(expandedDays);
                                if (isExpanded) {
                                  newExpanded.delete(date);
                                } else {
                                  newExpanded.add(date);
                                }
                                setExpandedDays(newExpanded);
                              }}
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-base">
                                  {new Date(date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {dayLogs.length} {dayLogs.length !== 1 ? t("workouts") : t("workout")} • {totalExercises} {totalExercises !== 1 ? t("exercises") : t("exercise")}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = new Set(expandedDays);
                                  if (isExpanded) {
                                    newExpanded.delete(date);
                                  } else {
                                    newExpanded.add(date);
                                  }
                                  setExpandedDays(newExpanded);
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-4" />
                                    {t("collapse")}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-4" />
                                    {t("expand")}
                                  </>
                                )}
                              </Button>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 space-y-3 pl-2 border-l-2">
                                {dayLogs.map((log, logIdx) => (
                                  <div
                                    key={log._id || logIdx}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="text-sm font-semibold">
                                        {t("workoutNumber")}{logIdx + 1}
                                      </div>
                                      {trainer?.type === "personal" && log._id && editingLogId !== log._id && (
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEditLog(log)}
                                          >
                                            <Pencil className="size-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteLog(log._id!)}
                                          >
                                            <Trash2 className="size-3.5" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    {editingLogId === log._id ? (
                                      <div className="space-y-2 p-2 border rounded-lg">
                                        <div>
                                          <Label className="text-xs">{t("date")}</Label>
                                          <Input
                                            type="date"
                                            value={editingLogDate}
                                            onChange={(e) => setEditingLogDate(e.target.value)}
                                            className="h-8 text-sm mt-1"
                                          />
                                        </div>
                                        {exerciseSets.length > 0 && (
                                          <div>
                                            <Label className="text-xs">{t("exerciseSetLabel")}</Label>
                                            <select
                                              value={editingLogSetId}
                                              onChange={(e) => {
                                                setEditingLogSetId(e.target.value);
                                                if (e.target.value) {
                                                  const set = exerciseSets.find((s) => s._id === e.target.value);
                                                  if (set) {
                                                    setEditingLogExercises(set.exercises.map((ex) => ({
                                                      name: ex.name,
                                                      sets: ex.defaultSets,
                                                      reps: ex.defaultReps,
                                                      weight: ex.defaultWeight,
                                                    })));
                                                  }
                                                }
                                              }}
                                              className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm"
                                            >
                                              <option value="">{t("loadFromExerciseSet")}</option>
                                              {exerciseSets.map((s) => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                        <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                                          {editingLogExercises.map((ex, idx) => (
                                            <div key={idx} className="border rounded p-2 space-y-1">
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{ex.name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => setEditingLogExercises((prev) => prev.filter((_, i) => i !== idx))}
                                                >
                                                  <Trash2 className="size-3.5" />
                                                </Button>
                                              </div>
                                              <div className="grid grid-cols-3 gap-1.5">
                                                <div>
                                                  <Label className="text-xs">{t("sets")}</Label>
                                                  <Input
                                                    type="number"
                                                    value={ex.sets}
                                                    onChange={(e) => setEditingLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, sets: Number(e.target.value) } : e2))}
                                                    className="h-7 text-xs"
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-xs">{t("reps")}</Label>
                                                  <Input
                                                    type="number"
                                                    value={ex.reps}
                                                    onChange={(e) => setEditingLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, reps: Number(e.target.value) } : e2))}
                                                    className="h-7 text-xs"
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-xs">{t("weight")}</Label>
                                                  <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={ex.weight || ""}
                                                    onChange={(e) => setEditingLogExercises((prev) => prev.map((e2, i) => i === idx ? { ...e2, weight: e.target.value ? Number(e.target.value) : undefined } : e2))}
                                                    className="h-7 text-xs"
                                                    placeholder="kg"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="flex-1"
                                            disabled={editingLogExercises.length === 0}
                                            onClick={saveEditLog}
                                          >
                                            <Save className="size-3.5 mr-1" />
                                            {t("save")}
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditLog}>
                                            <X className="size-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {log.exercises?.map((ex, exIdx) => (
                                          <div
                                            key={exIdx}
                                            className="flex items-center py-2 px-3 rounded-md bg-muted/30"
                                          >
                                            <div className="flex-1">
                                              <span className="font-medium text-sm">{ex.name}</span>
                                              <span className="text-xs text-muted-foreground ml-2">
                                                {ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}
                                                {ex.weight && ` @ ${ex.weight} ${t("weightUnit")}`}
                                              </span>
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
              })()
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "progress" && (
        <div className="space-y-4">
          {/* Progress sub-tab navigation */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setProgressSubTab("weight")}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
                progressSubTab === "weight"
                  ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {t("weightTab")}
            </button>
            <button
              onClick={() => setProgressSubTab("dimensions")}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-t-lg ${
                progressSubTab === "dimensions"
                  ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {t("dimensions")}
            </button>
          </div>

          {/* Weight sub-tab */}
          {progressSubTab === "weight" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{editingWeight ? t("editWeight") : t("addWeight")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weightError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{weightError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-4">
                      <div>
                        <Label>{t("date")}</Label>
                        <Input
                          type="date"
                          value={editingWeight ? editingWeight.date : weightDate}
                          onChange={(e) => {
                            if (editingWeight) {
                              setEditingWeight({ ...editingWeight, date: e.target.value });
                            } else {
                              setWeightDate(e.target.value);
                            }
                            setWeightError("");
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{t("weight")}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingWeight ? editingWeight.weight.toString() : newWeight}
                          onChange={(e) => {
                            if (editingWeight) {
                              setEditingWeight({ ...editingWeight, weight: parseFloat(e.target.value) || 0 });
                            } else {
                              setNewWeight(e.target.value);
                            }
                            setWeightError("");
                          }}
                          className="mt-1"
                          placeholder="kg"
                        />
                      </div>
                      <div className="flex gap-2">
                        {editingWeight ? (
                          <>
                            <Button onClick={updateWeight} className="flex-1">
                              <Save className="size-4" />
                              {t("save")}
                            </Button>
                            <Button onClick={cancelEditingWeight} variant="outline">
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <Button onClick={addWeight} className="w-full">
                            <Save className="size-4" />
                            {t("save")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {weights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{t("weightHistory")}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowWeightHistory(!showWeightHistory)}>
                          {showWeightHistory ? <><ChevronUp className="size-4" />{t("collapse")}</> : <><ChevronDown className="size-4" />{t("expand")}</>}
                        </Button>
                      </div>
                      {showWeightHistory && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(weightHistoryYear, weightHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { month: "long", year: "numeric" })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigateWeightMonth(-1)} title={t("previous")}>
                              <ChevronLeft className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { const t2 = new Date(); setWeightHistoryMonth(t2.getMonth()); setWeightHistoryYear(t2.getFullYear()); }} title={t("today")}>
                              <Calendar className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigateWeightMonth(1)} title={t("next")}>
                              <ChevronRight className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    {showWeightHistory && (
                      <CardContent>
                        {(() => {
                          if (weightHistoryData.length === 0) {
                            return <p className="text-muted-foreground text-center py-4">{t("noWeightDataForMonth")}</p>;
                          }
                          return (
                            <div className="h-[300px] overflow-y-auto space-y-2">
                              {weightHistoryData.map((weight) => (
                                <div key={weight._id || weight.date} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <div className="font-medium">{new Date(weight.date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                                    <div className="text-sm text-muted-foreground">{weight.weight} {t("weightUnit")}</div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => startEditingWeight(weight)} disabled={!!editingWeight}><Pencil className="size-4" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteWeight(weight._id!)} disabled={!!editingWeight}><Trash2 className="size-4" /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    )}
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader><CardTitle>{t("weightTab")}</CardTitle></CardHeader>
                <CardContent>
                  {weights.length > 0 ? (
                    <WeightChart data={weights} lang={lang} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">{t("noWeightData")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dimensions sub-tab */}
          {progressSubTab === "dimensions" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{editingDimension ? t("editDimensions") : t("addDimensions")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dimensionError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{dimensionError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-3">
                      <div>
                        <Label>{t("date")}</Label>
                        <Input
                          type="date"
                          value={editingDimension ? editingDimension.date : dimensionDate}
                          onChange={(e) => {
                            if (editingDimension) setEditingDimension({ ...editingDimension, date: e.target.value });
                            else setDimensionDate(e.target.value);
                            setDimensionError("");
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(["neck", "chest", "waist", "hips", "bicep", "thigh", "calf"] as const).map((field) => (
                          <div key={field}>
                            <Label className="text-xs">{t(`dimension${field.charAt(0).toUpperCase() + field.slice(1)}`)} ({t("dimensionsUnit")})</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="—"
                              value={editingDimension ? (editingDimension[field] ?? "") : (newDimension[field] ?? "")}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                if (editingDimension) setEditingDimension({ ...editingDimension, [field]: val });
                                else setNewDimension((prev) => ({ ...prev, [field]: val }));
                              }}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {editingDimension ? (
                          <>
                            <Button onClick={updateDimension} className="flex-1">
                              <Save className="size-4" />
                              {t("save")}
                            </Button>
                            <Button onClick={() => { setEditingDimension(null); setDimensionError(""); }} variant="outline">
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <Button onClick={addDimension} className="w-full">
                            <Save className="size-4" />
                            {t("saveDimensions")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {dimensionHistoryData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>{t("dimensionsHistory")}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[350px] overflow-y-auto space-y-2">
                        {dimensionHistoryData.map((entry) => (
                          <div key={entry._id || entry.date} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm">{new Date(entry.date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingDimension({ ...entry }); setDimensionError(""); }} disabled={!!editingDimension}><Pencil className="size-3.5" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteDimension(entry._id!)} disabled={!!editingDimension}><Trash2 className="size-3.5" /></Button>
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
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader><CardTitle>{t("dimensions")}</CardTitle></CardHeader>
                <CardContent>
                  {dimensions.length > 0 ? (
                    <DimensionsChart data={dimensions} lang={lang} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">{t("noDimensionsData")}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === "plans" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("workoutsPlan")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWorkoutPlan(!showWorkoutPlan)}
                >
                  {showWorkoutPlan ? (
                    <>
                      <ChevronUp className="size-4" />
                      {t("collapse")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-4" />
                      {t("expand")}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showWorkoutPlan && (
              <CardContent>
                {client.workoutPlan ? (
                  <p className="whitespace-pre-wrap text-sm">{client.workoutPlan}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">{t("noContent")}</p>
                )}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("dietPlan")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDietPlan(!showDietPlan)}
                >
                  {showDietPlan ? (
                    <>
                      <ChevronUp className="size-4" />
                      {t("collapse")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-4" />
                      {t("expand")}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showDietPlan && (
              <CardContent>
                {client.dietPlan ? (
                  <p className="whitespace-pre-wrap text-sm">{client.dietPlan}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">{t("noContent")}</p>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
