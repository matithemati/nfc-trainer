"use client";

import { useEffect, useState } from "react";
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMessages } from "@/lib/i18n";
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Save,
  Search
} from "lucide-react";

type Trainer = {
  _id: string;
  name: string;
  maxClients: number;
  isPaid: boolean;
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
};

type WorkoutLog = {
  _id?: string;
  clientId: string;
  date: string;
  exercises: WorkoutExercise[];
};

export function TrainerView({
  trainerId,
  lang,
}: {
  trainerId: string;
  lang: string;
}) {
  const { t, lang: currentLang } = getMessages(lang);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState("");
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
  const [expandedClientDetails, setExpandedClientDetails] = useState<Set<string>>(new Set());
  const [showCreateClient, setShowCreateClient] = useState(false);
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
  });
  const [editingWorkout, setEditingWorkout] = useState<{
    logId: string;
    date: string;
    exercises: WorkoutExercise[];
  } | null>(null);
  const [clientActiveTab, setClientActiveTab] = useState<"plans" | "workouts" | "history">("workouts");

  const load = async () => {
    try {
      const res = await fetch(`/api/trainers/${trainerId}/clients`);
      
      // Check if response has content before parsing JSON
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
        setExerciseNames((data.trainer as any).exerciseNames || []);
      } else {
        setError(data.error || "Failed to load trainer");
      }
    } catch (err) {
      setError("Failed to load trainer data");
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    load();
  }, [trainerId]);

  const createClient = async () => {
    setError("");
    const res = await fetch(`/api/trainers/${trainerId}/clients`, {
      method: "POST",
      body: JSON.stringify({ name: newClientName }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(
        data.error === "Max clients reached"
          ? t("maxClientsReached")
          : data.error
      );
      return;
    }
    setClients((prev) => [...prev, data]);
    setNewClientName("");
  };

  const loadExerciseNames = async () => {
    try {
      const res = await fetch(`/api/trainers/${trainerId}/exercise-names`);
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
      }
    } catch (err) {
      console.error("Failed to load exercise names:", err);
    }
  };

  const addExerciseName = async () => {
    if (!newExerciseName.trim()) return;
    try {
      const res = await fetch(`/api/trainers/${trainerId}/exercise-names`, {
        method: "POST",
        body: JSON.stringify({ exerciseName: newExerciseName }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
        setNewExerciseName("");
      }
    } catch (err) {
      console.error("Failed to add exercise name:", err);
    }
  };

  const deleteExerciseName = async (name: string) => {
    try {
      const res = await fetch(`/api/trainers/${trainerId}/exercise-names?exerciseName=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setExerciseNames(data.exerciseNames || []);
      }
    } catch (err) {
      console.error("Failed to delete exercise name:", err);
    }
  };

  useEffect(() => {
    if (trainerId) {
      loadExerciseNames();
    }
  }, [trainerId]);

  const selectClient = async (c: Client) => {
    setSelectedClient(c);
    setWorkoutPlan(c.workoutPlan);
    setDietPlan(c.dietPlan);
    setClientActiveTab("workouts");
    
    // Load workout history for this client
    try {
      const res = await fetch(`/api/clients/${c._id}/logs`);
      if (res.ok) {
        const logs = await res.json();
        setWorkoutLogs(logs);
      }
    } catch (err) {
      console.error("Failed to load workout logs:", err);
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
    } catch (err) {
      setError("Failed to save plan");
      console.error("Save error:", err);
    }
  };

  const updateWorkout = async (logId: string, date: string, exercises: WorkoutExercise[]) => {
    if (!selectedClient) return;
    const res = await fetch(`/api/clients/${selectedClient._id}/logs`, {
      method: "PATCH",
      body: JSON.stringify({
        logId,
        date,
        exercises,
      }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const updated = await res.json();
      setWorkoutLogs((prev) =>
        prev.map((log) => (log._id === logId ? updated : log))
      );
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
      setWorkoutLogs((prev) => prev.filter((log) => log._id !== logId));
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

  const updateExercise = async (
    logId: string,
    exerciseIndex: number,
    updatedExercise: WorkoutExercise
  ) => {
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
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(log);
    });
    return grouped;
  };

  const filterLogsByMonth = (logs: WorkoutLog[], month: number, year: number) => {
    return logs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === month && logDate.getFullYear() === year;
    });
  };

  const navigateWorkoutMonth = (direction: number) => {
    const newDate = new Date(workoutHistoryYear, workoutHistoryMonth + direction, 1);
    setWorkoutHistoryMonth(newDate.getMonth());
    setWorkoutHistoryYear(newDate.getFullYear());
  };

  const addExerciseToWorkout = () => {
    if (!newExercise.name) return;
    setWorkoutExercises([...workoutExercises, { ...newExercise }]);
    setNewExercise({ name: "", sets: 3, reps: 10 });
  };

  const removeExerciseFromWorkout = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, idx) => idx !== index));
  };

  const addWorkout = async () => {
    if (!selectedClient || workoutExercises.length === 0) return;
    try {
      const res = await fetch(`/api/clients/${selectedClient._id}/logs`, {
        method: "POST",
        body: JSON.stringify({
          date: workoutDate,
          exercises: workoutExercises,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const newLog = await res.json();
        setWorkoutLogs((prev) => [...prev, newLog]);
        setShowAddWorkout(false);
        setWorkoutExercises([]);
        setNewExercise({ name: "", sets: 3, reps: 10 });
      }
    } catch (err) {
      console.error("Failed to add workout:", err);
    }
  };

  const startEditingWorkout = (log: WorkoutLog) => {
    setEditingWorkout({
      logId: log._id!,
      date: log.date,
      exercises: [...log.exercises],
    });
  };

  const cancelEditingWorkout = () => {
    setEditingWorkout(null);
  };

  const addExerciseToEditingWorkout = () => {
    if (!editingWorkout || !newExercise.name) return;
    setEditingWorkout({
      ...editingWorkout,
      exercises: [...editingWorkout.exercises, { ...newExercise }],
    });
    setNewExercise({ name: "", sets: 3, reps: 10 });
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

  if (!trainer && !error) return <div>{t("loading")}</div>;
  
  if (error && !trainer) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!trainer) return null;

  return (
    <div className="space-y-4">
      {!trainer.isPaid && (
        <Alert variant="destructive">
          <AlertDescription>{t("trainerUnpaid")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">
                  {t("trainerHeader")}: {trainer.name}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("clients")}: {clients.length} / {trainer.maxClients}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateClient(!showCreateClient)}
              >
                {showCreateClient ? (
                  <>
                    <X className="size-4" />
                    {t("cancel")}
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    {t("createClient")}
                  </>
                )}
              </Button>
            </div>
            {showCreateClient && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t("clientName")}
                    className="flex-1"
                  />
                  <Button onClick={createClient}>
                    <Check className="size-4" />
                    {t("save")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("exerciseNames")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder={t("exerciseNamePlaceholder")}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addExerciseName();
                  }
                }}
              />
              <Button onClick={addExerciseName}>
                <Plus className="size-4" />
                {t("add")}
              </Button>
            </div>
            {exerciseNames.length > 0 && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    value={exerciseSearchTerm}
                    onChange={(e) => setExerciseSearchTerm(e.target.value)}
                    placeholder={t("search")}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 h-[140px] overflow-y-auto">
                  {exerciseNames
                    .filter((name) =>
                      name.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
                    )
                    .map((name) => (
                      <div key={name} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExerciseName(name)}
                          title={t("delete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </>
            )}
            {exerciseNames.length === 0 && (
              <p className="text-muted-foreground text-sm">{t("noExerciseNames")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("clients")} ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClientsYet")}</p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                <Input
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  placeholder={t("searchClients")}
                  className="pl-9"
                />
              </div>
              <div className="h-[450px] overflow-y-auto space-y-4">
                {(() => {
                  const expandedClientId = Array.from(expandedClientDetails)[0];
                  let clientsToShow = expandedClientId 
                    ? clients.filter(c => c._id === expandedClientId)
                    : clients;
                  
                  if (!expandedClientId && clientSearchTerm) {
                    clientsToShow = clientsToShow.filter(c =>
                      c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                      c._id.toLowerCase().includes(clientSearchTerm.toLowerCase())
                    );
                  }
                  
                  if (clientsToShow.length === 0) {
                    return (
                      <p key="no-results" className="text-center text-muted-foreground text-sm py-8">
                        {t("noResults")}
                      </p>
                    );
                  }
                  
                  return clientsToShow.map((c) => {
                    const isExpanded = expandedClientDetails.has(c._id);
                    return (
                      <div key={c._id} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{c.name}</div>
                            <a
                              href={`/${lang}/c/${c._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hidden md:inline text-xs text-slate-400 hover:text-foreground transition-colors font-mono hover:underline"
                            >
                              {t("nfcId")}: {c._id}
                            </a>
                            <Button
                              variant="outline"
                              size="sm"
                              className="md:hidden mt-1 h-7 text-xs font-mono"
                              onClick={() => {
                                window.open(`/${lang}/c/${c._id}`, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              {t("nfcId")}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (isExpanded) {
                                  const newExpanded = new Set(expandedClientDetails);
                                  newExpanded.delete(c._id);
                                  setExpandedClientDetails(newExpanded);
                                  if (selectedClient?._id === c._id) {
                                    setSelectedClient(null);
                                  }
                                } else {
                                  setExpandedClientDetails(new Set([c._id]));
                                  await selectClient(c);
                                }
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <EyeOff className="size-4" />
                                  {t("hide")}
                                </>
                              ) : (
                                <>
                                  <Eye className="size-4" />
                                  {t("show")}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        {isExpanded && selectedClient?._id === c._id && (
                          <div className="px-3 pb-3 pt-0 border-t">
                            {/* Tab Navigation */}
                            <div className="flex gap-2 border-b pt-3">
                              <button
                                onClick={() => setClientActiveTab("workouts")}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  clientActiveTab === "workouts"
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {t("addWorkout")}
                              </button>
                              <button
                                onClick={() => setClientActiveTab("history")}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  clientActiveTab === "history"
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {t("workoutHistory")}
                              </button>
                              <button
                                onClick={() => setClientActiveTab("plans")}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                  clientActiveTab === "plans"
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {t("workoutsPlan")} & {t("dietPlan")}
                              </button>
                            </div>

                            {/* Tab Content */}
                            {clientActiveTab === "workouts" && (
                              <div className="pt-3 space-y-3">
                                {!showAddWorkout && (
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowAddWorkout(true);
                                      setWorkoutDate(new Date().toISOString().split("T")[0]);
                                      setWorkoutExercises([]);
                                      setNewExercise({ name: "", sets: 3, reps: 10 });
                                      loadExerciseNames();
                                    }}
                                    className="w-full"
                                  >
                                    <Plus className="size-4" />
                                    {t("addWorkout")}
                                  </Button>
                                )}
                                {showAddWorkout && (
                                  <div className="space-y-3 p-3 border rounded-lg">
                                    <div>
                                      <Label className="text-sm">{t("date")}</Label>
                                      <Input
                                        type="date"
                                        value={workoutDate}
                                        onChange={(e) => setWorkoutDate(e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    
                                    {workoutExercises.length > 0 && (
                                      <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("exercises")}</Label>
                                        {workoutExercises.map((ex, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-sm">
                                              {ex.name} - {ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeExerciseFromWorkout(idx)}
                                              title={t("delete")}
                                            >
                                              <Trash2 className="size-4" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="border-t pt-3 space-y-3">
                                      <Label className="text-sm font-semibold">{t("addExercise")}</Label>
                                      <div>
                                        <Label className="text-sm">{t("exerciseName")}</Label>
                                        <select
                                          value={newExercise.name}
                                          onChange={(e) =>
                                            setNewExercise((ex) => ({ ...ex, name: e.target.value }))
                                          }
                                          className="w-full mt-1 px-3 py-2 border rounded-md"
                                        >
                                          <option value="">{t("selectExercise")}</option>
                                          {exerciseNames.map((name) => (
                                            <option key={name} value={name}>
                                              {name}
                                            </option>
                                          ))}
                                        </select>
                                        {exerciseNames.length === 0 && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {t("noExerciseNamesHint")}
                                          </p>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-sm">{t("sets")}</Label>
                                          <Input
                                            type="number"
                                            value={newExercise.sets}
                                            onChange={(e) =>
                                              setNewExercise((ex) => ({ ...ex, sets: Number(e.target.value) }))
                                            }
                                            className="mt-1"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm">{t("reps")}</Label>
                                          <Input
                                            type="number"
                                            value={newExercise.reps}
                                            onChange={(e) =>
                                              setNewExercise((ex) => ({ ...ex, reps: Number(e.target.value) }))
                                            }
                                            className="mt-1"
                                          />
                                        </div>
                                      </div>
                                      <Button 
                                        onClick={addExerciseToWorkout} 
                                        className="w-full"
                                        disabled={!newExercise.name}
                                      >
                                        <Plus className="size-4" />
                                        {t("addExercise")}
                                      </Button>
                                    </div>

                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={addWorkout} 
                                        className="flex-1"
                                        disabled={workoutExercises.length === 0}
                                      >
                                        <Save className="size-4" />
                                        {t("saveWorkout")}
                                      </Button>
                                      <Button 
                                        variant="outline"
                                        onClick={() => {
                                          setShowAddWorkout(false);
                                          setWorkoutExercises([]);
                                          setNewExercise({ name: "", sets: 3, reps: 10 });
                                        }}
                                      >
                                        <X className="size-4" />
                                        {t("cancel")}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {clientActiveTab === "history" && (
                              <div className="pt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  {workoutLogs.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigateWorkoutMonth(-1)}
                                        title={t("previous")}
                                      >
                                        <ChevronLeft className="size-4" />
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
                                        <span className="hidden md:inline">{t("next")}</span>
                                        <ChevronRight className="size-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {workoutLogs.length > 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                                      month: "long",
                                      year: "numeric",
                                    })}
                                  </div>
                                )}
                                {workoutLogs.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">{t("noWorkoutHistory")}</p>
                                ) : (
                                  (() => {
                                    const filteredLogs = filterLogsByMonth(workoutLogs, workoutHistoryMonth, workoutHistoryYear);
                                    const groupedLogs = groupLogsByDay(filteredLogs);
                                    
                                    if (Object.keys(groupedLogs).length === 0) {
                                      return (
                                        <p className="text-muted-foreground text-sm">
                                          {t("noWorkoutsForMonth")} {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", {
                                            month: "long",
                                            year: "numeric",
                                          })}
                                        </p>
                                      );
                                    }

                                    return (
                                      <div className="space-y-3">
                                        {Object.entries(groupedLogs)
                                          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                                          .map(([date, dayLogs]) => {
                                            const isExpanded = expandedDays.has(date);
                                            const totalExercises = dayLogs.reduce((sum, log) => sum + (log.exercises?.length || 0), 0);
                                            return (
                                              <div key={date} className="space-y-3">
                                                <div className="flex items-center justify-between border-b pb-2">
                                                  <div className="font-semibold text-sm">
                                                    {new Date(date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                                                      weekday: "long",
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                    })} ({dayLogs.length} {dayLogs.length !== 1 ? t("workouts") : t("workout")}, {totalExercises} {totalExercises !== 1 ? t("exercises") : t("exercise")})
                                                  </div>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
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
                                                  <div className="space-y-3">
                                                    {dayLogs.map((log, logIdx) => (
                                                      <div
                                                        key={log._id || logIdx}
                                                        className="border rounded-lg p-4 space-y-2"
                                                      >
                                                        {editingWorkout?.logId === log._id && editingWorkout ? (
                                                          <div className="space-y-3">
                                                            <div>
                                                              <Label className="text-sm font-semibold">{t("date")}</Label>
                                                              <Input
                                                                type="date"
                                                                value={editingWorkout.date}
                                                                onChange={(e) => {
                                                                  setEditingWorkout({
                                                                    logId: editingWorkout.logId,
                                                                    date: e.target.value,
                                                                    exercises: editingWorkout.exercises,
                                                                  });
                                                                }}
                                                                className="mt-1"
                                                              />
                                                            </div>

                                                            {editingWorkout.exercises.length > 0 && (
                                                              <div className="space-y-2">
                                                                <Label className="text-sm font-semibold">{t("workoutNumber")}{logIdx + 1} - {t("exercises")}</Label>
                                                                {editingWorkout.exercises.map((ex, idx) => (
                                                                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                                                    <span className="text-sm">
                                                                      {ex.name} - {ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}
                                                                    </span>
                                                                    <Button
                                                                      variant="ghost"
                                                                      size="sm"
                                                                      onClick={() => removeExerciseFromEditingWorkout(idx)}
                                                                      title={t("delete")}
                                                                    >
                                                                      <Trash2 className="size-4" />
                                                                    </Button>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            )}

                                                            <div className="border-t pt-3 space-y-3">
                                                              <Label className="text-sm font-semibold">{t("workoutNumber")}{logIdx + 1} - {t("addExercise")}</Label>
                                                              <div>
                                                                <Label className="text-sm">{t("exerciseName")}</Label>
                                                                <select
                                                                  value={newExercise.name}
                                                                  onChange={(e) =>
                                                                    setNewExercise((ex) => ({ ...ex, name: e.target.value }))
                                                                  }
                                                                  className="w-full mt-1 px-3 py-2 border rounded-md"
                                                                >
                                                                  <option value="">{t("selectExercise")}</option>
                                                                  {exerciseNames.map((name) => (
                                                                    <option key={name} value={name}>
                                                                      {name}
                                                                    </option>
                                                                  ))}
                                                                </select>
                                                              </div>
                                                              <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                  <Label className="text-sm">{t("sets")}</Label>
                                                                  <Input
                                                                    type="number"
                                                                    value={newExercise.sets}
                                                                    onChange={(e) =>
                                                                      setNewExercise((ex) => ({ ...ex, sets: Number(e.target.value) }))
                                                                    }
                                                                    className="mt-1"
                                                                  />
                                                                </div>
                                                                <div>
                                                                  <Label className="text-sm">{t("reps")}</Label>
                                                                  <Input
                                                                    type="number"
                                                                    value={newExercise.reps}
                                                                    onChange={(e) =>
                                                                      setNewExercise((ex) => ({ ...ex, reps: Number(e.target.value) }))
                                                                    }
                                                                    className="mt-1"
                                                                  />
                                                                </div>
                                                              </div>
                                                              <Button
                                                                onClick={addExerciseToEditingWorkout}
                                                                className="w-full"
                                                                disabled={!newExercise.name}
                                                              >
                                                                <Plus className="size-4" />
                                                                {t("addExercise")}
                                                              </Button>
                                                            </div>

                                                            <div className="flex gap-2">
                                                              <Button
                                                                onClick={saveEditedWorkout}
                                                                className="flex-1"
                                                                disabled={!editingWorkout || editingWorkout.exercises.length === 0}
                                                              >
                                                                <Save className="size-4" />
                                                                {t("save")}
                                                              </Button>
                                                              <Button
                                                                variant="outline"
                                                                onClick={cancelEditingWorkout}
                                                              >
                                                                <X className="size-4" />
                                                                {t("cancel")}
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            <div className="flex items-center justify-between mb-2">
                                                              <div className="text-sm font-semibold">
                                                                {t("workoutNumber")}{logIdx + 1}
                                                              </div>
                                                              <div className="flex gap-2">
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() => startEditingWorkout(log)}
                                                                  title={t("edit")}
                                                                >
                                                                  <Pencil className="size-4" />
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() => deleteWorkout(log._id!)}
                                                                  title={t("delete")}
                                                                >
                                                                  <Trash2 className="size-4" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                              {log.exercises?.map((ex, exIdx) => (
                                                                <div
                                                                  key={exIdx}
                                                                  className="flex items-center justify-between py-2 px-3 rounded border"
                                                                >
                                                                  {editingExercise?.logId === log._id &&
                                                                  editingExercise?.exerciseIndex === exIdx ? (
                                                                    <div className="flex-1 space-y-2">
                                                                      <select
                                                                        value={editingExercise.exercise.name}
                                                                        onChange={(e) =>
                                                                          setEditingExercise({
                                                                            ...editingExercise,
                                                                            exercise: {
                                                                              ...editingExercise.exercise,
                                                                              name: e.target.value,
                                                                            },
                                                                          })
                                                                        }
                                                                        className="w-full px-3 py-2 border rounded-md"
                                                                      >
                                                                        <option value="">{t("selectExercise")}</option>
                                                                        {exerciseNames.map((name) => (
                                                                          <option key={name} value={name}>
                                                                            {name}
                                                                          </option>
                                                                        ))}
                                                                      </select>
                                                                      <div className="flex gap-2 items-center">
                                                                        <Input
                                                                          type="number"
                                                                          value={editingExercise.exercise.sets}
                                                                          onChange={(e) =>
                                                                            setEditingExercise({
                                                                              ...editingExercise,
                                                                              exercise: {
                                                                                ...editingExercise.exercise,
                                                                                sets: Number(e.target.value),
                                                                              },
                                                                            })
                                                                          }
                                                                          placeholder={t("sets")}
                                                                          className="w-20"
                                                                        />
                                                                        <Input
                                                                          type="number"
                                                                          value={editingExercise.exercise.reps}
                                                                          onChange={(e) =>
                                                                            setEditingExercise({
                                                                              ...editingExercise,
                                                                              exercise: {
                                                                                ...editingExercise.exercise,
                                                                                reps: Number(e.target.value),
                                                                              },
                                                                            })
                                                                          }
                                                                          placeholder={t("reps")}
                                                                          className="w-20"
                                                                        />
                                                                        <Button
                                                                          size="sm"
                                                                          onClick={() =>
                                                                            updateExercise(
                                                                              log._id!,
                                                                              exIdx,
                                                                              editingExercise.exercise
                                                                            )
                                                                          }
                                                                        >
                                                                          <Check className="size-4" />
                                                                          {t("save")}
                                                                        </Button>
                                                                        <Button
                                                                          variant="outline"
                                                                          size="sm"
                                                                          onClick={() => setEditingExercise(null)}
                                                                        >
                                                                          <X className="size-4" />
                                                                          {t("cancel")}
                                                                        </Button>
                                                                      </div>
                                                                    </div>
                                                                  ) : (
                                                                    <>
                                                                      <div className="flex-1">
                                                                        <span className="font-medium">{ex.name}</span>
                                                                        <span className="text-sm text-muted-foreground ml-2">
                                                                          {ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}
                                                                        </span>
                                                                      </div>
                                                                      <div className="flex gap-2">
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          onClick={() =>
                                                                            setEditingExercise({
                                                                              logId: log._id!,
                                                                              exerciseIndex: exIdx,
                                                                              exercise: ex,
                                                                            })
                                                                          }
                                                                          title={t("edit")}
                                                                        >
                                                                          <Pencil className="size-4" />
                                                                        </Button>
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          onClick={() => deleteExercise(log._id!, exIdx)}
                                                                          title={t("delete")}
                                                                        >
                                                                          <Trash2 className="size-4" />
                                                                        </Button>
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
                                )}
                              </div>
                            )}

                            {clientActiveTab === "plans" && (
                              <div className="pt-3 space-y-3">
                                <div>
                                  <Label className="text-sm font-semibold">{t("workoutsPlan")}</Label>
                                  <Textarea
                                    value={workoutPlan}
                                    onChange={(e) => setWorkoutPlan(e.target.value)}
                                    rows={4}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold">{t("dietPlan")}</Label>
                                  <Textarea
                                    value={dietPlan}
                                    onChange={(e) => setDietPlan(e.target.value)}
                                    rows={4}
                                    className="mt-1"
                                  />
                                </div>
                                <Button size="sm" onClick={savePlan} className="w-full">
                                  <Save className="size-4" />
                                  {t("save")}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
