"use client";

import { useEffect, useState } from "react";
import { WeightChart } from "./Charts";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMessages } from "@/lib/i18n";
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
  AlertCircle
} from "lucide-react";

type Trainer = {
  _id: string;
  name: string;
  maxClients: number;
  expirationDate?: string | null;
};

type Client = {
  _id: string;
  trainerId: string;
  name: string;
  workoutPlan: string;
  dietPlan: string;
};

type WeightPoint = { _id?: string; date: string; weight: number };

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
  const [showWorkoutPlan, setShowWorkoutPlan] = useState(false);
  const [showDietPlan, setShowDietPlan] = useState(false);

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
    
    setWeights((prev) => [...prev, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
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
    
    setWeights((prev) => 
      prev.map(w => w._id === editingWeight._id ? data : w)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    );
    setEditingWeight(null);
  };

  const deleteWeight = async (weightId: string) => {
    if (!confirm(t("confirmDeleteWeight"))) return;
    
    const res = await fetch(`/api/clients/${clientId}/weights?weightId=${weightId}`, {
      method: "DELETE",
    });
    
    if (res.ok) {
      setWeights((prev) => prev.filter(w => w._id !== weightId));
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

  const navigateWeightMonth = (direction: number) => {
    const newDate = new Date(weightHistoryYear, weightHistoryMonth + direction, 1);
    setWeightHistoryMonth(newDate.getMonth());
    setWeightHistoryYear(newDate.getFullYear());
  };

  const filterWeightsByMonth = (weights: WeightPoint[], month: number, year: number) => {
    return weights.filter((weight) => {
      const weightDate = new Date(weight.date);
      return weightDate.getMonth() === month && weightDate.getFullYear() === year;
    });
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

      {/* Tab Navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 border-b bg-card min-w-max">
          <button
            onClick={() => setActiveTab("workouts")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "workouts"
                ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t("workoutHistory")}
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "progress"
                ? "border-b-2 border-primary text-foreground font-semibold bg-muted/30"
                : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t("progressChart")}
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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
              {logs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWorkoutMonth(-1)}
                    title={t("previous")}
                  >
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
                                    <div className="text-sm font-semibold mb-2">
                                      {t("workoutNumber")}{logIdx + 1}
                                    </div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowWeightHistory(!showWeightHistory)}
                    >
                      {showWeightHistory ? (
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
                  {showWeightHistory && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {new Date(weightHistoryYear, weightHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWeightMonth(-1)}
                          title={t("previous")}
                        >
                          <span className="hidden md:inline">{t("previous")}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            setWeightHistoryMonth(today.getMonth());
                            setWeightHistoryYear(today.getFullYear());
                          }}
                          title={t("today")}
                        >
                          <Calendar className="size-4" />
                          <span className="hidden md:inline">{t("today")}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWeightMonth(1)}
                          title={t("next")}
                        >
                          <span className="hidden md:inline">{t("next")}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                {showWeightHistory && (
                  <CardContent>
                    {(() => {
                      const filteredWeights = filterWeightsByMonth(weights, weightHistoryMonth, weightHistoryYear);
                      
                      if (filteredWeights.length === 0) {
                        return (
                          <p className="text-muted-foreground text-center py-4">
                            {t("noWeightDataForMonth")} {new Date(weightHistoryYear, weightHistoryMonth, 1).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        );
                      }

                      return (
                        <div className="h-[300px] overflow-y-auto space-y-2">
                          {filteredWeights
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((weight) => (
                              <div
                                key={weight._id || weight.date}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <div className="font-medium">
                                    {new Date(weight.date).toLocaleDateString(currentLang === "pl" ? "pl-PL" : "en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {weight.weight} {t("weightUnit")}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingWeight(weight)}
                                    disabled={!!editingWeight}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteWeight(weight._id!)}
                                    disabled={!!editingWeight}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
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
            <CardHeader>
              <CardTitle>{t("progressChart")}</CardTitle>
            </CardHeader>
            <CardContent>
              {weights.length > 0 ? (
                <WeightChart data={weights} lang={lang} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {t("noWeightData")}
                </p>
              )}
            </CardContent>
          </Card>
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
