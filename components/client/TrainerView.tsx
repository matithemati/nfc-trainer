"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMessages } from "@/lib/i18n";

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

  const selectClient = async (c: Client) => {
    setSelectedClient(c);
    setWorkoutPlan(c.workoutPlan);
    setDietPlan(c.dietPlan);
    
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

      <Card>
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
              {showCreateClient ? t("cancel") : t("createClient")}
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
                  {t("save")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("clients")} ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClientsYet")}</p>
          ) : (
            clients.map((c) => {
              const isExpanded = expandedClientDetails.has(c._id);
              return (
                <div key={c._id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-400">
                        {t("nfcId")}: {c._id}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const newExpanded = new Set(expandedClientDetails);
                          if (isExpanded) {
                            newExpanded.delete(c._id);
                            if (selectedClient?._id === c._id) {
                              setSelectedClient(null);
                            }
                          } else {
                            newExpanded.add(c._id);
                            await selectClient(c);
                          }
                          setExpandedClientDetails(newExpanded);
                        }}
                      >
                        {isExpanded ? t("collapse") : t("expand")}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && selectedClient?._id === c._id && (
                    <div className="px-3 pb-3 pt-0 border-t space-y-4">
                      <div className="pt-3 space-y-3">
                        <div>
                          <Label className="text-sm font-semibold">{t("workoutsPlan")}</Label>
                          <Textarea
                            value={workoutPlan}
                            onChange={(e) => setWorkoutPlan(e.target.value)}
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">{t("dietPlan")}</Label>
                          <Textarea
                            value={dietPlan}
                            onChange={(e) => setDietPlan(e.target.value)}
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <Button size="sm" onClick={savePlan} className="w-full">
                          {t("save")}
                        </Button>
                      </div>

                      <div className="pt-3 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">{t("workoutHistory")}</Label>
                          {workoutLogs.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateWorkoutMonth(-1)}
                              >
                                {t("previous")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date();
                                  setWorkoutHistoryMonth(today.getMonth());
                                  setWorkoutHistoryYear(today.getFullYear());
                                }}
                              >
                                {t("today")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateWorkoutMonth(1)}
                              >
                                {t("next")}
                              </Button>
                            </div>
                          )}
                        </div>
                        {workoutLogs.length > 0 && (
                          <div className="text-xs text-muted-foreground">
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
                              <div className="space-y-4">
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
                                            {isExpanded ? t("collapse") : t("expand")}
                                          </Button>
                                        </div>
                                        {isExpanded && (
                                          <div className="space-y-3">
                                            {dayLogs.map((log, logIdx) => (
                                              <div
                                                key={log._id || logIdx}
                                                className="border rounded-lg p-4 space-y-2"
                                              >
                                                <div className="text-xs text-muted-foreground mb-2">
                                                  {t("workoutNumber")}{logIdx + 1}
                                                </div>
                                                <div className="space-y-2">
                                                  {log.exercises?.map((ex, exIdx) => (
                                                    <div
                                                      key={exIdx}
                                                      className="flex items-center justify-between py-2 px-3 rounded border"
                                                    >
                                                      <div className="flex-1">
                                                        <span className="font-medium">{ex.name}</span>
                                                        <span className="text-sm text-muted-foreground ml-2">
                                                          {ex.sets} {t("setsLabel")} × {ex.reps} {t("repsLabel")}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
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
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
