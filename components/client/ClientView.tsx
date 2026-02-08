"use client";

import { useEffect, useState } from "react";
import { WeightChart } from "./Charts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

type WeightPoint = { date: string; weight: number };

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
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [workoutDate, setWorkoutDate] = useState(getTodayDate());
  const [exercise, setExercise] = useState<WorkoutExercise>({
    name: "",
    sets: 3,
    reps: 10,
  });
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [editingExercise, setEditingExercise] = useState<{
    logId: string;
    exerciseIndex: number;
    exercise: WorkoutExercise;
  } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [workoutHistoryMonth, setWorkoutHistoryMonth] = useState(new Date().getMonth());
  const [workoutHistoryYear, setWorkoutHistoryYear] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      setClient(data.client);
      setTrainer(data.trainer);

      const wRes = await fetch(`/api/clients/${clientId}/weights`);
      setWeights(await wRes.json());

      const lRes = await fetch(`/api/clients/${clientId}/logs`);
      setLogs(await lRes.json());
    })();
  }, [clientId]);

  const addWeight = async () => {
    if (!newWeight || !weightDate) return;
    const res = await fetch(`/api/clients/${clientId}/weights`, {
      method: "POST",
      body: JSON.stringify({
        date: weightDate,
        weight: parseFloat(newWeight),
      }),
      headers: { "Content-Type": "application/json" },
    });
    const saved = await res.json();
    setWeights((prev) => [...prev, saved]);
    setNewWeight("");
    setWeightDate(getTodayDate());
  };

  const addWorkout = async () => {
    if (!workoutDate || !exercise.name) return;
    const res = await fetch(`/api/clients/${clientId}/logs`, {
      method: "POST",
      body: JSON.stringify({
        date: workoutDate,
        exercises: [exercise],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const saved = await res.json();
    setLogs((prev) => [...prev, saved]);
    setWorkoutDate(getTodayDate());
    setExercise({ name: "", sets: 3, reps: 10 });
  };

  const updateWorkout = async (logId: string, date: string, exercises: WorkoutExercise[]) => {
    const res = await fetch(`/api/clients/${clientId}/logs`, {
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
      setLogs((prev) =>
        prev.map((log) => (log._id === logId ? updated : log))
      );
      setEditingLog(null);
    }
  };

  const deleteWorkout = async (logId: string) => {
    if (!confirm(t("confirmDeleteWorkout"))) return;
    const res = await fetch(`/api/clients/${clientId}/logs?logId=${logId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLogs((prev) => prev.filter((log) => log._id !== logId));
    }
  };

  const deleteExercise = async (logId: string, exerciseIndex: number) => {
    const log = logs.find((l) => l._id === logId);
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
    const log = logs.find((l) => l._id === logId);
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

  if (!client) return <div>{t("loading")}</div>;

  return (
    <div className="space-y-4">
      {trainer && !trainer.isPaid && (
        <Alert variant="destructive">
          <AlertDescription>{t("unpaidWarningClient")}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("clientHeader")}: {client.name}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("workoutsPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            {client.workoutPlan ? (
              <p className="whitespace-pre-wrap">{client.workoutPlan}</p>
            ) : (
              <p className="text-muted-foreground">{t("noContent")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dietPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            {client.dietPlan ? (
              <p className="whitespace-pre-wrap">{client.dietPlan}</p>
            ) : (
              <p className="text-muted-foreground">{t("noContent")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("addWeight")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>{t("date")}</Label>
            <Input
              type="date"
              value={weightDate}
              onChange={(e) => setWeightDate(e.target.value)}
            />
            <Label>{t("weight")}</Label>
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
            />
            <Button onClick={addWeight} className="mt-2">
              {t("save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("progressChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={weights} lang={lang} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("addWorkout")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("date")}</Label>
          <Input
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
          />
          <Label>{t("exerciseName")}</Label>
          <Input
            value={exercise.name}
            onChange={(e) =>
              setExercise((ex) => ({ ...ex, name: e.target.value }))
            }
          />
          <Label>{t("sets")}</Label>
          <Input
            type="number"
            value={exercise.sets}
            onChange={(e) =>
              setExercise((ex) => ({ ...ex, sets: Number(e.target.value) }))
            }
          />
          <Label>{t("reps")}</Label>
          <Input
            type="number"
            value={exercise.reps}
            onChange={(e) =>
              setExercise((ex) => ({ ...ex, reps: Number(e.target.value) }))
            }
          />
          <Button onClick={addWorkout} className="mt-2">
            {t("save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("workoutHistory")}</CardTitle>
            {logs.length > 0 && (
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
          {logs.length > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              {new Date(workoutHistoryYear, workoutHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">{t("noWorkoutHistory")}</p>
          ) : (
            (() => {
              const filteredLogs = filterLogsByMonth(logs, workoutHistoryMonth, workoutHistoryYear);
              const groupedLogs = groupLogsByDay(filteredLogs);
              
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
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, dayLogs]) => {
                  const isExpanded = expandedDays.has(date);
                  const totalExercises = dayLogs.reduce((sum, log) => sum + (log.exercises?.length || 0), 0);
                  return (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="font-semibold text-base">
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
                              {editingExercise?.logId === log._id &&
                              editingExercise?.exerciseIndex === exIdx ? (
                                <div className="flex-1 space-y-2">
                                  <Input
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
                                    placeholder={t("exerciseName")}
                                  />
                                  <div className="flex gap-2">
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
                                      {t("save")}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingExercise(null)}
                                    >
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
                                    >
                                      {t("edit")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteExercise(log._id!, exIdx)}
                                    >
                                      {t("delete")}
                                    </Button>
                                  </div>
                                </>
                              )}
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
        </CardContent>
      </Card>
    </div>
  );
}
