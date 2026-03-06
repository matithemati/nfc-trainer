// components/admin/ClientsManagement.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    return trainer ? `${trainer.name} (${trainer.email})` : trainerId;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("clients")}</h1>
        </div>

      {/* Controls */}
      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchClientsByName")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={selectedTrainerId || "all"} onValueChange={(value) => setSelectedTrainerId(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("selectTrainer")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTrainers") || "All Trainers"}</SelectItem>
              {trainers.map((trainer) => (
                <SelectItem key={trainer._id} value={trainer._id}>
                  {trainer.name} ({trainer.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id="showDeleted"
              checked={showDeleted}
              onCheckedChange={(checked) => {
                setShowDeleted(checked === true);
                setPage(1);
              }}
            />
            <Label htmlFor="showDeleted" className="cursor-pointer mb-0">
              {t("showDeleted")}
            </Label>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              {t("createClient")}
            </Button>
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
                  <Input
                    id="name"
                    value={createFormData.name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trainerId">{t("selectTrainer")}</Label>
                  <Select
                    value={createFormData.trainerId}
                    onValueChange={(value) =>
                      setCreateFormData({ ...createFormData, trainerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectTrainer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer._id} value={trainer._id}>
                          {trainer.name} ({trainer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setCreateFormData({ name: "", trainerId: "" });
                  }}
                >
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="submit" className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
                  <Save className="h-4 w-4" />
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">{t("loading")}</div>
          ) : clients.length === 0 ? (
            <div className="p-4">{t("noClients")}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clientName")}</TableHead>
                    <TableHead>{t("selectTrainer")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client._id}>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{getTrainerName(client.trainerId)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingClient(client);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("edit")}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(client._id)}
                                  disabled={!!client.deletedAt}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("delete")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination && (
                <div className="flex flex-col gap-4 p-4 border-t">
                  {/* Top row: Page info and page size selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="text-sm text-muted-foreground">
                      {t("page")} {pagination.page} / {pagination.totalPages} ({pagination.total} {t("items")})
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">{t("perPage") || "Per page"}:</Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => setPageSize(parseInt(value))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Bottom row: Navigation buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPage(1)}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("previousPage")}
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {(() => {
                        const pages: (number | string)[] = [];
                        const totalPages = pagination.totalPages;
                        const currentPage = pagination.page;
                        
                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Always show first page
                          pages.push(1);
                          
                          if (currentPage > 3) {
                            pages.push("...");
                          }
                          
                          // Show pages around current page
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          
                          for (let i = start; i <= end; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(i);
                            }
                          }
                          
                          if (currentPage < totalPages - 2) {
                            pages.push("...");
                          }
                          
                          // Always show last page
                          pages.push(totalPages);
                        }
                        
                        return pages.map((pageNum, idx) => {
                          if (pageNum === "...") {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                                ...
                              </span>
                            );
                          }
                          
                          const isActive = pageNum === currentPage;
                          return (
                            <Button
                              key={pageNum}
                              variant={isActive ? undefined : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum as number)}
                              className={isActive ? "bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90" : ""}
                            >
                              {pageNum}
                            </Button>
                          );
                        });
                      })()}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      {t("nextPage")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPage(pagination.totalPages)}
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          {editingClient && (
            <form
              onSubmit={handleUpdate}
              onReset={() => {
                setEditFormData({
                  name: editingClient.name,
                  trainerId: editingClient.trainerId,
                });
              }}
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
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-trainerId">{t("moveToTrainer")}</Label>
                  <Select
                    value={editFormData.trainerId || editingClient.trainerId}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, trainerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer._id} value={trainer._id}>
                          {trainer.name} ({trainer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingClient(null);
                    setEditFormData({ name: "", trainerId: "" });
                  }}
                >
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="submit" className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
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
