// components/admin/TrainersManagement.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getMessages } from "@/lib/i18n";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { ObjectId } from "mongodb";
import { Pencil, Calendar, StickyNote, Trash2, Search, Plus, Save, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Trainer = {
  _id: string;
  name: string;
  email: string;
  type?: "personal" | "studio";
  maxClients?: number;
  expirationDate?: string | null;
  pricePerMonth?: number | null;
  notes?: Array<{
    timestamp: string;
    adminId: string;
    note: string;
  }>;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function TrainersManagement({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [createType, setCreateType] = useState<"personal" | "studio">("studio");
  const [editType, setEditType] = useState<"personal" | "studio">("studio");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isProlongDialogOpen, setIsProlongDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [editingClientCount, setEditingClientCount] = useState<number | null>(null);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        showDeleted: showDeleted.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const res = await fetch(`/api/admin/trainers?${params}`);
      const data = await res.json();
      setTrainers(data.trainers || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Error fetching trainers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTrainers();
  }, [page, pageSize, showDeleted, debouncedSearch]);

  useEffect(() => {
    // Reset to page 1 when page size changes
    setPage(1);
  }, [pageSize]);

  // Helper to convert date input (YYYY-MM-DD) to ISO string at end of day
  const convertLocalDateTimeToISO = (dateString: string): string => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    const eod = new Date(year, month - 1, day, 23, 59, 59, 999);
    return eod.toISOString();
  };

  // Helper to convert ISO string to date input format (YYYY-MM-DD)
  const convertISOToLocalDateTime = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleCreate = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const expirationDate = formData.get("expirationDate") as string;
    const pricePerMonth = formData.get("pricePerMonth") as string;

    try {
      const res = await fetch("/api/admin/trainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          type: createType,
          expirationDate: expirationDate ? convertLocalDateTimeToISO(expirationDate) : null,
          pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        setCreateType("studio");
        fetchTrainers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create trainer");
      }
    } catch (error) {
      console.error("Error creating trainer:", error);
      alert("Failed to create trainer");
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingTrainer) return;

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const expirationDate = formData.get("expirationDate") as string;
    const pricePerMonth = formData.get("pricePerMonth") as string;
    const maxClients = formData.get("maxClients") as string;

    try {
      const res = await fetch(`/api/admin/trainers/${editingTrainer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          type: editType,
          expirationDate: expirationDate ? convertLocalDateTimeToISO(expirationDate) : null,
          pricePerMonth: pricePerMonth ? parseFloat(pricePerMonth) : null,
          maxClients: maxClients ? parseInt(maxClients) : undefined,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingTrainer(null);
        fetchTrainers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update trainer");
      }
    } catch (error) {
      console.error("Error updating trainer:", error);
      alert("Failed to update trainer");
    }
  };

  const handleDelete = async (trainerId: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/admin/trainers/${trainerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTrainers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete trainer");
      }
    } catch (error) {
      console.error("Error deleting trainer:", error);
      alert("Failed to delete trainer");
    }
  };

  const handleProlong = async (months: number) => {
    if (!selectedTrainer) return;

    try {
      const res = await fetch(`/api/admin/trainers/${selectedTrainer._id}/prolong`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });

      if (res.ok) {
        setIsProlongDialogOpen(false);
        setSelectedTrainer(null);
        fetchTrainers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to prolong membership");
      }
    } catch (error) {
      console.error("Error prolonging membership:", error);
      alert("Failed to prolong membership");
    }
  };

  const handleAddNote = async (formData: FormData) => {
    if (!selectedTrainer) return;

    const note = formData.get("note") as string;

    try {
      const res = await fetch(`/api/admin/trainers/${selectedTrainer._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      if (res.ok) {
        setIsNoteDialogOpen(false);
        setSelectedTrainer(null);
        fetchTrainers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("trainers")}</h1>
          {pagination && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
              {pagination.total} total
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="showDeleted" checked={showDeleted} onCheckedChange={(c) => { setShowDeleted(c === true); setPage(1); }} />
              <Label htmlFor="showDeleted" className="cursor-pointer mb-0 text-sm">{t("showDeleted")}</Label>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />{t("createTrainer")}</Button>
            </DialogTrigger>
            <DialogContent>
              <form action={handleCreate}>
                <DialogHeader>
                  <DialogTitle>{t("createTrainer")}</DialogTitle>
                  <DialogDescription>{t("createTrainer")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div><Label htmlFor="name">{t("trainerName")}</Label><Input id="name" name="name" required className="mt-1" /></div>
                  <div><Label htmlFor="email">{t("trainerEmail")}</Label><Input id="email" name="email" type="email" required className="mt-1" /></div>
                  <div>
                    <Label>{t("trainerType")}</Label>
                    <Select value={createType} onValueChange={(v) => setCreateType(v as "personal" | "studio")}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">{t("trainerTypePersonal")}</SelectItem>
                        <SelectItem value="studio">{t("trainerTypeStudio")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="expirationDate">{t("membershipExpiration")}</Label><Input id="expirationDate" name="expirationDate" type="date" className="mt-1" /></div>
                  <div><Label htmlFor="pricePerMonth">{t("pricePerMonth")}</Label><Input id="pricePerMonth" name="pricePerMonth" type="number" step="0.01" className="mt-1" /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}><X className="h-4 w-4" />{t("cancel")}</Button>
                  <Button type="submit"><Save className="h-4 w-4" />{t("save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trainer List */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Column header – hidden on mobile */}
          <div className="hidden lg:grid grid-cols-[1fr_1fr_88px_120px_96px_132px] gap-2 px-5 py-2.5 bg-muted/50 border-b border-border">
            {[t("trainerName"), t("trainerEmail"), t("trainerType"), t("membershipExpiration"), t("pricePerMonth"), t("actions")].map((h) => (
              <span key={h} className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-7 w-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : trainers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("noTrainers")}</div>
          ) : (
            <div className="divide-y divide-border">
              {trainers.map((trainer) => {
                const expDays = trainer.expirationDate
                  ? Math.ceil((new Date(trainer.expirationDate).getTime() - Date.now()) / 86400000)
                  : null;
                const isExpired = expDays !== null && expDays < 0;
                const isUrgent = expDays !== null && expDays >= 0 && expDays <= 14;
                const isDeleted = !!trainer.deletedAt;
                const initials = trainer.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                const isPersonal = trainer.type === "personal";

                return (
                  <div
                    key={trainer._id}
                    className={`group flex flex-col lg:grid lg:grid-cols-[1fr_1fr_88px_120px_96px_132px] gap-x-2 gap-y-1.5 px-5 py-3.5 items-start lg:items-center transition-colors ${
                      isDeleted ? "opacity-50 bg-destructive/5" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Name + avatar */}
                    <div className="flex items-center gap-2.5 min-w-0 w-full">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isPersonal ? "bg-primary/10 border border-primary/20" : "bg-cyan-500/10 border border-cyan-500/20"
                      }`}>
                        <span className={`text-[10px] font-bold ${isPersonal ? "text-primary" : "text-cyan-600"}`}>{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{trainer.name}</div>
                        {isDeleted && <div className="text-[10px] font-medium text-destructive">deleted</div>}
                        {/* Email on mobile */}
                        <div className="text-xs text-muted-foreground truncate lg:hidden">{trainer.email}</div>
                      </div>
                    </div>

                    {/* Email – desktop only */}
                    <span className="hidden lg:block text-xs text-muted-foreground truncate">{trainer.email}</span>

                    {/* Type badge */}
                    <div className="hidden lg:block">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isPersonal
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                      }`}>
                        {isPersonal ? t("trainerTypePersonal") : t("trainerTypeStudio")}
                      </span>
                    </div>

                    {/* Expiry */}
                    <span className={`hidden lg:block text-xs font-bold ${
                      isExpired ? "text-destructive" : isUrgent ? "text-warning" : "text-muted-foreground"
                    }`}>
                      {trainer.expirationDate
                        ? isExpired ? t("expired") : expDays === 0 ? t("today") : `${expDays}d`
                        : "—"}
                    </span>

                    {/* Price */}
                    <span className="hidden lg:block text-xs text-muted-foreground">
                      {trainer.pricePerMonth ? `${trainer.pricePerMonth} zł` : "—"}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1.5 items-center lg:ml-0 mt-1 lg:mt-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors cursor-pointer"
                              onClick={() => { setSelectedTrainer(trainer); setIsProlongDialogOpen(true); }}
                            >
                              <Calendar className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("prolongMembership")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                              onClick={() => {
                                setEditingTrainer(trainer);
                                setEditType(trainer.type === "personal" ? "personal" : "studio");
                                setEditingClientCount(null);
                                setIsEditDialogOpen(true);
                                fetch(`/api/admin/trainers/${trainer._id}`)
                                  .then((r) => r.json())
                                  .then((d) => setEditingClientCount(d.clientsCount ?? 0))
                                  .catch(() => setEditingClientCount(0));
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("edit")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors cursor-pointer"
                              onClick={() => { setSelectedTrainer(trainer); setIsNoteDialogOpen(true); }}
                            >
                              <StickyNote className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("addNote")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              onClick={() => handleDelete(trainer._id)}
                              disabled={!!trainer.deletedAt}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("delete")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination && trainers.length > 0 && (
            <div className="border-t border-border px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("page")} {pagination.page} / {pagination.totalPages} ({pagination.total} {t("items")})
                </span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="px-2 text-xs text-muted-foreground">{pagination.page}</span>
                <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPage(pagination.totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          {editingTrainer && (
            <form action={handleUpdate}>
              <DialogHeader>
                <DialogTitle>{t("editTrainer")}</DialogTitle>
                <DialogDescription>{t("editTrainer")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-name">{t("trainerName")}</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingTrainer.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">{t("trainerEmail")}</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={editingTrainer.email}
                    required
                  />
                </div>
                <div>
                  <Label>{t("trainerType")}</Label>
                  <Select value={editType} onValueChange={(v) => setEditType(v as "personal" | "studio")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">{t("trainerTypePersonal")}</SelectItem>
                      <SelectItem value="studio">{t("trainerTypeStudio")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-expirationDate">{t("membershipExpiration")}</Label>
                  <Input
                    id="edit-expirationDate"
                    name="expirationDate"
                    type="date"
                    defaultValue={
                      editingTrainer.expirationDate
                        ? convertISOToLocalDateTime(editingTrainer.expirationDate)
                        : ""
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pricePerMonth">{t("pricePerMonth")}</Label>
                  <Input
                    id="edit-pricePerMonth"
                    name="pricePerMonth"
                    type="number"
                    step="0.01"
                    defaultValue={editingTrainer.pricePerMonth || ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-currentClients">{t("currentClients")}</Label>
                    <Input
                      id="edit-currentClients"
                      type="number"
                      value={editingClientCount ?? "…"}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-maxClients">{t("maxClients")}</Label>
                    <Input
                      id="edit-maxClients"
                      name="maxClients"
                      type="number"
                      min="1"
                      defaultValue={editingTrainer.maxClients ?? 10}
                      className="mt-1"
                    />
                  </div>
                </div>
                {editingTrainer.notes && editingTrainer.notes.length > 0 && (
                  <div>
                    <Label>{t("notes")}</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {editingTrainer.notes.map((note, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded">
                          <div className="font-semibold">
                            {new Date(note.timestamp).toLocaleString()}
                          </div>
                          <div>{note.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingTrainer(null);
                  }}
                >
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="submit" >
                  <Save className="h-4 w-4" />
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Prolong Dialog */}
      <Dialog open={isProlongDialogOpen} onOpenChange={setIsProlongDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("prolongMembership")}</DialogTitle>
            <DialogDescription>
              {selectedTrainer && (
                <span>
                  {t("currentExpirationDate")}:{" "}
                  <strong>
                    {selectedTrainer.expirationDate
                      ? new Date(selectedTrainer.expirationDate).toLocaleDateString()
                      : t("noExpirationDate")}
                  </strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            <Button onClick={() => handleProlong(1)} >
              <Calendar className="h-4 w-4" />
              {t("prolong1Month")}
            </Button>
            <Button onClick={() => handleProlong(3)} >
              <Calendar className="h-4 w-4" />
              {t("prolong3Months")}
            </Button>
            <Button onClick={() => handleProlong(6)} >
              <Calendar className="h-4 w-4" />
              {t("prolong6Months")}
            </Button>
            <Button onClick={() => handleProlong(12)} >
              <Calendar className="h-4 w-4" />
              {t("prolong12Months")}
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsProlongDialogOpen(false);
                setSelectedTrainer(null);
              }}
            >
              <X className="h-4 w-4" />
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          {selectedTrainer && (
            <form action={handleAddNote}>
              <DialogHeader>
                <DialogTitle>{t("addNote")}</DialogTitle>
                <DialogDescription>{t("addNote")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="note">{t("notes")}</Label>
                  <Textarea id="note" name="note" required />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNoteDialogOpen(false);
                    setSelectedTrainer(null);
                  }}
                >
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="submit" >
                  <Save className="h-4 w-4" />
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
