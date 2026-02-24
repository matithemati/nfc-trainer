// components/admin/LogsManagement.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMessages } from "@/lib/i18n";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { ChevronLeft, ChevronRight, Eye, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminLog = {
  _id: string;
  adminId: string;
  admin?: {
    username: string;
    email: string;
  };
  operationType: "create" | "update" | "delete" | "prolong";
  affectedCollection: "trainers" | "clients";
  affectedId: string;
  note?: string;
  timestamp: string;
  metadata: {
    ip?: string;
    userAgent?: string;
  };
};

type Admin = {
  _id: string;
  username: string;
  email: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function LogsManagement({ lang }: { lang: string }) {
  const { t } = getMessages(lang);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    adminId: "",
    operationType: "",
    affectedCollection: "",
    from: "",
    to: "",
    trainerSearch: "",
    clientSearch: "",
  });
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  const fetchAdmins = async () => {
    try {
      // We'll need to fetch admins from the API
      // For now, we'll extract unique admin IDs from logs
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        ),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || null);
      
      // Extract unique admins from logs
      const uniqueAdmins = new Map<string, Admin>();
      data.logs?.forEach((log: AdminLog) => {
        if (log.admin && !uniqueAdmins.has(log.adminId)) {
          uniqueAdmins.set(log.adminId, {
            _id: log.adminId,
            username: log.admin.username || "",
            email: log.admin.email || "",
          });
        }
      });
      setAdmins(Array.from(uniqueAdmins.values()));
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, filters]);

  useEffect(() => {
    // Reset to page 1 when page size changes
    setPage(1);
  }, [pageSize]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };


  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar lang={lang} />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("logs")}</h1>
        </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("filterByUser")}</Label>
              <Select
                value={filters.adminId || "all"}
                onValueChange={(value) => handleFilterChange("adminId", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("filterByUser")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all") || "All"}</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin._id} value={admin._id}>
                      {admin.username || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("filterByOperation")}</Label>
              <Select
                value={filters.operationType || "all"}
                onValueChange={(value) => handleFilterChange("operationType", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("filterByOperation")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all") || "All"}</SelectItem>
                  <SelectItem value="create">{t("create")}</SelectItem>
                  <SelectItem value="update">{t("update")}</SelectItem>
                  <SelectItem value="delete">{t("delete")}</SelectItem>
                  <SelectItem value="prolong">{t("prolong")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("filterByCollection")}</Label>
              <Select
                value={filters.affectedCollection || "all"}
                onValueChange={(value) => handleFilterChange("affectedCollection", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("filterByCollection")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all") || "All"}</SelectItem>
                  <SelectItem value="trainers">{t("trainers")}</SelectItem>
                  <SelectItem value="clients">{t("clients")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("from")}</Label>
              <Input
                type="datetime-local"
                value={filters.from}
                onChange={(e) => handleFilterChange("from", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("to")}</Label>
              <Input
                type="datetime-local"
                value={filters.to}
                onChange={(e) => handleFilterChange("to", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("searchTrainersByEmail")}</Label>
              <Input
                placeholder={t("searchTrainersByEmail")}
                value={filters.trainerSearch}
                onChange={(e) => handleFilterChange("trainerSearch", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("searchClientsByName")}</Label>
              <Input
                placeholder={t("searchClientsByName")}
                value={filters.clientSearch}
                onChange={(e) => handleFilterChange("clientSearch", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">{t("loading")}</div>
          ) : logs.length === 0 ? (
            <div className="p-4">{t("noLogs")}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("timestamp") || "Timestamp"}</TableHead>
                    <TableHead>{t("filterByUser")}</TableHead>
                    <TableHead>{t("operationType")}</TableHead>
                    <TableHead>{t("affectedCollection")}</TableHead>
                    <TableHead>{t("affectedId")}</TableHead>
                    <TableHead>{t("note")}</TableHead>
                    <TableHead>{t("actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.admin?.username || log.admin?.email || log.adminId}
                      </TableCell>
                      <TableCell>{t(log.operationType)}</TableCell>
                      <TableCell>{t(log.affectedCollection)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.affectedId.toString().slice(0, 8)}...
                      </TableCell>
                      <TableCell>{log.note || "-"}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedLog(log)}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("viewDetails") || "View details"}</p>
                            </TooltipContent>
                          </Tooltip>
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
                      {t("page")} {pagination.page} / {pagination.totalPages} ({pagination.total} items)
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
                              variant={isActive ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum as number)}
                              className={isActive ? "bg-black text-white hover:bg-black/90" : ""}
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

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("logDetails") || "Log Details"}</DialogTitle>
            <DialogDescription>{t("logDetailsDescription") || "Complete log record information"}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">{t("timestamp") || "Timestamp"}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">{t("operationType") || "Operation Type"}</Label>
                  <p className="text-sm text-muted-foreground mt-1">{t(selectedLog.operationType)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">{t("affectedCollection") || "Affected Collection"}</Label>
                  <p className="text-sm text-muted-foreground mt-1">{t(selectedLog.affectedCollection)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">{t("affectedId") || "Affected ID"}</Label>
                  <p className="text-sm font-mono text-xs text-muted-foreground mt-1 break-all">
                    {selectedLog.affectedId}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">{t("filterByUser") || "Admin"}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLog.admin?.username || selectedLog.admin?.email || selectedLog.adminId}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Admin ID</Label>
                  <p className="text-sm font-mono text-xs text-muted-foreground mt-1 break-all">
                    {selectedLog.adminId}
                  </p>
                </div>
                {selectedLog.note && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">{t("note") || "Note"}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedLog.note}</p>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Metadata</Label>
                <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Log ID</Label>
                <p className="text-sm font-mono text-xs text-muted-foreground mt-1 break-all">
                  {selectedLog._id}
                </p>
              </div>
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Full Record (JSON)</Label>
                <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-60 overflow-y-auto">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
