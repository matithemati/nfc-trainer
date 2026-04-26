// components/admin/ClientsManagement.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMessages } from "@/lib/i18n";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { Pencil, Trash2, Search, Plus, Save, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

type Client = {
  _id: string;
  trainerId: string;
  name: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Trainer = {
  _id: string;
  name: string;
  email: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function ClientsManagement({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    trainerId: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    trainerId: "",
  });

  const fetchTrainers = async () => {
    try {
      const res = await fetch("/api/admin/trainers?limit=1000");
      const data = await res.json();
      setTrainers(data.trainers || []);
    } catch (error) {
      console.error("Error fetching trainers:", error);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        showDeleted: showDeleted.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedTrainerId && { trainerId: selectedTrainerId }),
      });
      const res = await fetch(`/api/admin/clients?${params}`);
      const data = await res.json();
      setClients(data.clients || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [page, pageSize, showDeleted, debouncedSearch, selectedTrainerId]);

  useEffect(() => {
    // Reset to page 1 when page size changes
    setPage(1);
  }, [pageSize]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, trainerId } = createFormData;

    if (!name || !trainerId) {
      alert(t("nameRequired") || "Name and trainer are required");
      return;
    }

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trainerId,
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        setCreateFormData({ name: "", trainerId: "" });
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create client");
      }
    } catch (error) {
      console.error("Error creating client:", error);
      alert("Failed to create client");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const { name, trainerId } = editFormData;

    if (!name) {
      alert(t("nameRequired") || "Name is required");
      return;
    }

    try {
      const res = await fetch(`/api/admin/clients/${editingClient._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trainerId: trainerId || editingClient.trainerId,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        setEditingClient(null);
        setEditFormData({ name: "", trainerId: "" });
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update client");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Failed to update client");
    }
  };

  useEffect(() => {
    if (editingClient) {
      setEditFormData({
        name: editingClient.name,
        trainerId: editingClient.trainerId,
      });
    }
  }, [editingClient]);

  const handleDelete = async (clientId: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    }
  };


  const getTrainerName = (trainerId: string) => {
    const trainer = trainers.find((t) => t._id === trainerId);
    return trainer ? trainer.name : trainerId;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{t("clients")}</h1>
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
                placeholder={t("searchClientsByName")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={selectedTrainerId || "all"} onValueChange={(value) => setSelectedTrainerId(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("selectTrainer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTrainers") || "All Trainers"}</SelectItem>
                {trainers.map((trainer) => (
                  <SelectItem key={trainer._id} value={trainer._id}>
                    {trainer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="showDeleted" checked={showDeleted} onCheckedChange={(c) => { setShowDeleted(c === true); setPage(1); }} />
              <Label htmlFor="showDeleted" className="cursor-pointer mb-0 text-sm">{t("showDeleted")}</Label>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />{t("createClient")}</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>{t("createClient")}</DialogTitle>
                  <DialogDescription>{t("createClient")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">{t("clientName")}</Label>
                    <Input id="name" value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="trainerId">{t("selectTrainer")}</Label>
                    <Select value={createFormData.trainerId} onValueChange={(value) => setCreateFormData({ ...createFormData, trainerId: value })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("selectTrainer")} /></SelectTrigger>
                      <SelectContent>
                        {trainers.map((trainer) => (
                          <SelectItem key={trainer._id} value={trainer._id}>{trainer.name} ({trainer.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); setCreateFormData({ name: "", trainerId: "" }); }}><X className="h-4 w-4" />{t("cancel")}</Button>
                  <Button type="submit"><Save className="h-4 w-4" />{t("save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Client List */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Column header – hidden on mobile */}
          <div className="hidden lg:grid grid-cols-[1fr_1fr_96px] gap-2 px-5 py-2.5 bg-muted/50 border-b border-border">
            {[t("clientName"), t("selectTrainer"), t("actions")].map((h) => (
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
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                  <div className="h-7 w-16 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("noClients")}</div>
          ) : (
            <div className="divide-y divide-border">
              {clients.map((client) => {
                const isDeleted = !!client.deletedAt;
                const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                const trainerName = getTrainerName(client.trainerId);

                return (
                  <div
                    key={client._id}
                    className={`group flex flex-col lg:grid lg:grid-cols-[1fr_1fr_96px] gap-x-2 gap-y-1.5 px-5 py-3.5 items-start lg:items-center transition-colors ${
                      isDeleted ? "opacity-50 bg-destructive/5" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Name + avatar */}
                    <div className="flex items-center gap-2.5 min-w-0 w-full">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                        <span className="text-[10px] font-bold text-primary">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{client.name}</div>
                        {isDeleted && <div className="text-[10px] font-medium text-destructive">deleted</div>}
                        {/* Trainer name on mobile */}
                        <div className="text-xs text-muted-foreground truncate lg:hidden">{trainerName}</div>
                      </div>
                    </div>

                    {/* Trainer name – desktop only */}
                    <span className="hidden lg:block text-xs text-muted-foreground truncate">{trainerName}</span>

                    {/* Actions */}
                    <div className="flex gap-1.5 items-center mt-1 lg:mt-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                              onClick={() => { setEditingClient(client); setIsEditDialogOpen(true); }}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{t("edit")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              onClick={() => handleDelete(client._id)}
                              disabled={isDeleted}
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

          {pagination && clients.length > 0 && (
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
            {editingClient && (
              <form
                onSubmit={handleUpdate}
                onReset={() => setEditFormData({ name: editingClient.name, trainerId: editingClient.trainerId })}
              >
                <DialogHeader>
                  <DialogTitle>{t("editClient")}</DialogTitle>
                  <DialogDescription>{t("editClient")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="edit-name">{t("clientName")}</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name || editingClient.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-trainerId">{t("moveToTrainer")}</Label>
                    <Select
                      value={editFormData.trainerId || editingClient.trainerId}
                      onValueChange={(value) => setEditFormData({ ...editFormData, trainerId: value })}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {trainers.map((trainer) => (
                          <SelectItem key={trainer._id} value={trainer._id}>{trainer.name} ({trainer.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingClient(null); setEditFormData({ name: "", trainerId: "" }); }}>
                    <X className="h-4 w-4" />{t("cancel")}
                  </Button>
                  <Button type="submit"><Save className="h-4 w-4" />{t("save")}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
