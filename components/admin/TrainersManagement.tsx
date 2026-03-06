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
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("trainers")}</h1>
        </div>

      {/* Controls */}
      <div className="flex gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
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
              {t("createTrainer")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("createTrainer")}</DialogTitle>
                <DialogDescription>{t("createTrainer")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">{t("trainerName")}</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="email">{t("trainerEmail")}</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label>{t("trainerType")}</Label>
                  <Select value={createType} onValueChange={(v) => setCreateType(v as "personal" | "studio")}>
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
                  <Label htmlFor="expirationDate">{t("membershipExpiration")}</Label>
                  <Input id="expirationDate" name="expirationDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="pricePerMonth">{t("pricePerMonth")}</Label>
                  <Input id="pricePerMonth" name="pricePerMonth" type="number" step="0.01" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
          ) : trainers.length === 0 ? (
            <div className="p-4">{t("noTrainers")}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("trainerName")}</TableHead>
                    <TableHead>{t("trainerEmail")}</TableHead>
                    <TableHead>{t("trainerType")}</TableHead>
                    <TableHead>{t("membershipExpiration")}</TableHead>
                    <TableHead>{t("pricePerMonth")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer) => (
                    <TableRow key={trainer._id}>
                      <TableCell>{trainer.name}</TableCell>
                      <TableCell>{trainer.email}</TableCell>
                      <TableCell>{trainer.type === "personal" ? t("trainerTypePersonal") : t("trainerTypeStudio")}</TableCell>
                      <TableCell>
                        {trainer.expirationDate
                          ? new Date(trainer.expirationDate).toLocaleDateString()
                          : t("noExpirationDate")}
                      </TableCell>
                      <TableCell>
                        {trainer.pricePerMonth ? `$${trainer.pricePerMonth}` : "-"}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
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
                                  onClick={() => {
                                    setSelectedTrainer(trainer);
                                    setIsProlongDialogOpen(true);
                                  }}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("prolongMembership")}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedTrainer(trainer);
                                    setIsNoteDialogOpen(true);
                                  }}
                                >
                                  <StickyNote className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("addNote")}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(trainer._id)}
                                  disabled={!!trainer.deletedAt}
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
                <Button type="submit" className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
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
            <Button onClick={() => handleProlong(1)} className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
              <Calendar className="h-4 w-4" />
              {t("prolong1Month")}
            </Button>
            <Button onClick={() => handleProlong(3)} className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
              <Calendar className="h-4 w-4" />
              {t("prolong3Months")}
            </Button>
            <Button onClick={() => handleProlong(6)} className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
              <Calendar className="h-4 w-4" />
              {t("prolong6Months")}
            </Button>
            <Button onClick={() => handleProlong(12)} className="bg-black text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
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
