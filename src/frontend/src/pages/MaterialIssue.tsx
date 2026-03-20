import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUpFromLine,
  Layers,
  Loader2,
  PackageOpen,
  Pencil,
  Plus,
  Trash2,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateMaterialIssue,
  useDeleteMaterialIssue,
  useMaterialIssues,
  useUpdateMaterialIssue,
  useWarehouseStock,
} from "../hooks/useQueries";
import type { MaterialIssue as MaterialIssueType } from "../types";

// ─── Constants ─────────────────────────────────────────────────────────────────

const WAREHOUSE_OPTIONS: { value: string; label: string }[] = [
  { value: "oeRawMaterial", label: "OE Raw Material" },
  { value: "ringRawMaterial", label: "Ring Raw Material" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function formatDate(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function warehouseLabel(w: Warehouse | string): string {
  if ((w as string) === "oeRawMaterial") return "OE Raw Material";
  if ((w as string) === "ringRawMaterial") return "Ring Raw Material";
  return String(w);
}

// ─── Warehouse Badge ───────────────────────────────────────────────────────────

function WarehouseBadge({ warehouse }: { warehouse: Warehouse | string }) {
  const isOE = (warehouse as string) === "oeRawMaterial";
  return (
    <Badge
      variant="outline"
      className={
        isOE
          ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
          : "bg-purple-50 text-purple-700 border-purple-200 text-xs"
      }
    >
      {warehouseLabel(warehouse)}
    </Badge>
  );
}

// ─── Default Form ──────────────────────────────────────────────────────────────

const defaultForm = {
  issueNumber: "",
  issueDate: todayStr(),
  department: "",
  warehouse: "" as Warehouse | "",
  materialName: "",
  grade: "",
  issuedQty: "",
  remarks: "",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MaterialIssue() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { materialNames, departments } = useDropdownOptionsContext();

  const { data: issues = [], isLoading } = useMaterialIssues();
  const { data: warehouseStock = [] } = useWarehouseStock();
  const createMutation = useCreateMaterialIssue();
  const deleteMutation = useDeleteMaterialIssue();
  const updateMutation = useUpdateMaterialIssue();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [editItem, setEditItem] = useState<MaterialIssueType | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Filter warehouse stock by selected warehouse and aggregate by material name
  const stockForWarehouse = (() => {
    const filtered = warehouseStock.filter(
      (s) => (s.warehouse as string) === form.warehouse,
    );
    // Aggregate: sum totalQty for records with the same materialName
    const aggregated = new Map<string, number>();
    for (const s of filtered) {
      const key = s.materialName;
      aggregated.set(key, (aggregated.get(key) ?? 0) + Number(s.totalQty));
    }
    return Array.from(aggregated.entries()).map(([materialName, totalQty]) => ({
      materialName,
      totalQty: BigInt(Math.round(totalQty)),
      warehouse: form.warehouse,
    }));
  })();

  function generateIssueNumber() {
    const year = new Date().getFullYear();
    const nextNum = issues.length + 1;
    return `MI-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  function openAdd() {
    setEditItem(null);
    setForm({ ...defaultForm, issueNumber: generateIssueNumber() });
    setDialogOpen(true);
  }

  function openEdit(item: MaterialIssueType) {
    setEditItem(item);
    const dateStr = new Date(Number(item.issueDate) / 1_000_000)
      .toISOString()
      .substring(0, 10);
    setForm({
      issueNumber: item.issueNumber,
      issueDate: dateStr,
      department: item.department,
      warehouse: item.warehouse as typeof form.warehouse,
      materialName: item.materialName,
      grade: item.grade,
      issuedQty: String(Number(item.issuedQty)),
      remarks: item.remarks,
    });
    setDialogOpen(true);
  }

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await fn();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.issuedQty);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!editItem) {
      if (!form.department) {
        toast.error("Please select a department");
        return;
      }
      if (!form.warehouse) {
        toast.error("Please select a warehouse");
        return;
      }
      if (!form.materialName.trim()) {
        toast.error("Please enter material name");
        return;
      }
    }

    try {
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            department: form.department,
            warehouse: form.warehouse as Warehouse,
            materialName: form.materialName.trim(),
            grade: form.grade.trim(),
            issuedQty: BigInt(Math.round(qty)),
            remarks: form.remarks.trim(),
            issueDate:
              BigInt(new Date(form.issueDate).getTime()) * BigInt(1_000_000),
          }),
        );
        toast.success("Material issue updated");
        setEditItem(null);
      } else {
        await withRetry(() =>
          createMutation.mutateAsync({
            department: form.department,
            warehouse: form.warehouse as Warehouse,
            materialName: form.materialName.trim(),
            grade: form.grade.trim(),
            issuedQty: BigInt(Math.round(qty)),
            remarks: form.remarks.trim(),
            issueDate:
              BigInt(new Date(form.issueDate).getTime()) * BigInt(1_000_000),
          }),
        );
        toast.success(
          `Issue ${form.issueNumber} created — stock deducted from ${warehouseLabel(form.warehouse as Warehouse)}`,
        );
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Operation failed:", err);
      if (!isLoggedIn) {
        toast.error("Please sign in to save data");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        const match = msg.match(/Reject text: (.+)/);
        const displayMsg = match
          ? match[1]
          : msg.length > 0 && msg.length < 200
            ? msg
            : "Operation failed. Please check that the material name matches your inward records exactly.";
        toast.error(displayMsg);
      }
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await withRetry(() => deleteMutation.mutateAsync(deleteId));
      toast.success("Material issue deleted — stock restored");
    } catch (error) {
      console.error("Operation failed:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(
        isLoggedIn ? msg || "Delete failed" : "Please sign in to save data",
      );
    } finally {
      setDeleteId(null);
    }
  }

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    issueDate: todayStr(),
    warehouse: "" as Warehouse | "",
    department: "",
  });
  // bulkMaterialMap: materialName -> { qty: string, grade: string }
  const [bulkMaterialMap, setBulkMaterialMap] = useState<
    Map<string, { qty: string; grade: string }>
  >(new Map());
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const LATEST_COUNT_MI = 25;
  const hasDateFilters = !!fromDate || !!toDate;
  const filteredIssues = [...issues]
    .sort((a, b) => (a.id > b.id ? -1 : 1))
    .filter((entry) => {
      if (!hasDateFilters) return true;
      const ms = Number(BigInt(entry.issueDate) / 1_000_000n);
      const entryDate = new Date(ms).toISOString().split("T")[0];
      if (fromDate && entryDate < fromDate) return false;
      if (toDate && entryDate > toDate) return false;
      return true;
    });
  const displayedIssues = hasDateFilters
    ? filteredIssues
    : filteredIssues.slice(0, LATEST_COUNT_MI);
  const isShowingLimitedMI = !hasDateFilters && issues.length > LATEST_COUNT_MI;

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries = Array.from(bulkMaterialMap.entries()).filter(
      ([, { qty }]) => qty && Number(qty) > 0,
    );
    if (entries.length === 0) {
      toast.error("Please enter quantity for at least one material");
      return;
    }
    if (!bulkForm.warehouse) {
      toast.error("Please select a warehouse");
      return;
    }
    if (!bulkForm.department) {
      toast.error("Please select a department");
      return;
    }
    setIsBulkSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const [materialName, { qty, grade }] of entries) {
      try {
        await withRetry(() =>
          createMutation.mutateAsync({
            department: bulkForm.department,
            warehouse: bulkForm.warehouse as Warehouse,
            materialName: materialName,
            grade: grade.trim(),
            issuedQty: BigInt(Math.round(Number(qty))),
            remarks: "",
            issueDate:
              BigInt(new Date(bulkForm.issueDate).getTime()) *
              BigInt(1_000_000),
          }),
        );
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setIsBulkSubmitting(false);
    if (successCount > 0)
      toast.success(
        `${successCount} issue${successCount > 1 ? "s" : ""} created`,
      );
    if (errorCount > 0)
      toast.error(`${errorCount} issue${errorCount > 1 ? "s" : ""} failed`);
    if (successCount > 0) {
      setBulkDialogOpen(false);
      setBulkMaterialMap(new Map());
    }
  }

  // Summary: total issued today
  const todayNs = BigInt(new Date().setHours(0, 0, 0, 0)) * BigInt(1_000_000);
  const issuedToday = issues.filter((i) => i.issueDate >= todayNs);
  const totalIssuedTodayKg = issuedToday.reduce(
    (acc, i) => acc + Number(i.issuedQty),
    0,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Material Issue"
        description="Issue raw materials to departments — stock is deducted automatically from the respective warehouse"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              data-ocid="material-issue.secondary_button"
              onClick={() => {
                setBulkForm({
                  issueDate: todayStr(),
                  warehouse: "" as Warehouse | "",
                  department: "",
                });
                setBulkMaterialMap(new Map());
                setBulkDialogOpen(true);
              }}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Bulk Issue
            </Button>
            <Button
              data-ocid="material-issue.primary_button"
              onClick={openAdd}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Issue
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <ArrowUpFromLine className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Issues Today
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {issuedToday.length}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
            <PackageOpen className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Qty Issued Today (Kg)
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {totalIssuedTodayKg.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <WarehouseIcon className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Issues
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {issues.length}
            </p>
          </div>
        </div>
      </div>

      {/* Issues Table */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-from-date"
            className="text-sm font-medium text-muted-foreground whitespace-nowrap"
          >
            From Date
          </label>
          <input
            id="filter-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-to-date"
            className="text-sm font-medium text-muted-foreground whitespace-nowrap"
          >
            To Date
          </label>
          <input
            id="filter-to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {hasDateFilters && (
          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-background hover:bg-muted transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div
            data-ocid="material-issue.loading_state"
            className="p-4 space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : displayedIssues.length === 0 && issues.length === 0 ? (
          <EmptyState
            data-ocid="material-issue.empty_state"
            icon={<ArrowUpFromLine className="w-7 h-7" />}
            title="No material issues yet"
            description="Issue raw materials to departments daily. Stock is automatically deducted from the warehouse."
            actionLabel="New Issue"
            onAction={openAdd}
          />
        ) : (
          <Table data-ocid="material-issue.table">
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Issue No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Issue Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Department
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Warehouse
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Material Name
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Grade
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Issued Qty (Kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Remarks
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedIssues.map((issue, idx) => (
                <TableRow
                  key={String(issue.id)}
                  data-ocid={`material-issue.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary">
                    {issue.issueNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(issue.issueDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                    >
                      {issue.department}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <WarehouseBadge warehouse={issue.warehouse} />
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {issue.materialName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {issue.grade || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-destructive">
                    -{Number(issue.issuedQty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {issue.remarks || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`material-issue.edit_button.${idx + 1}`}
                          onClick={() => openEdit(issue)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`material-issue.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(issue.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* New Issue Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setEditItem(null);
          setDialogOpen(o);
        }}
      >
        <DialogContent
          data-ocid="material-issue.dialog"
          className="sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-primary" />
              {editItem ? "Edit Material Issue" : "New Material Issue"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Issue No. & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="mi-number">Issue No.</Label>
                  <span className="text-xs text-muted-foreground italic">
                    (auto)
                  </span>
                </div>
                <Input
                  id="mi-number"
                  data-ocid="material-issue.input"
                  value={form.issueNumber}
                  readOnly
                  placeholder="Generating…"
                  className="bg-muted/60 text-muted-foreground cursor-default select-none font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mi-date">Issue Date</Label>
                <Input
                  id="mi-date"
                  type="date"
                  data-ocid="material-issue.input"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, issueDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Department & Warehouse */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mi-dept">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, department: v }))
                  }
                  required
                >
                  <SelectTrigger id="mi-dept" data-ocid="material-issue.select">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mi-warehouse">Warehouse</Label>
                <Select
                  value={form.warehouse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, warehouse: v as Warehouse }))
                  }
                  required
                >
                  <SelectTrigger
                    id="mi-warehouse"
                    data-ocid="material-issue.select"
                  >
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_OPTIONS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Available stock hint */}
            {form.warehouse && stockForWarehouse.length > 0 && (
              <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Stock in{" "}
                  {warehouseLabel(form.warehouse as Warehouse)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {stockForWarehouse.map((s) => (
                    <button
                      key={`${s.warehouse as string}-${s.materialName}`}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, materialName: s.materialName }))
                      }
                      className="text-xs px-2 py-1 rounded bg-background border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                      {s.materialName}{" "}
                      <span className="font-mono font-semibold">
                        {Number(s.totalQty).toLocaleString()} kg
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Material Name & Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mi-material">Material Name</Label>
                <Select
                  value={form.materialName}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, materialName: v }))
                  }
                  required
                >
                  <SelectTrigger
                    id="mi-material"
                    data-ocid="material-issue.select"
                  >
                    <SelectValue placeholder="Select material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materialNames.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mi-grade">Grade</Label>
                <Input
                  id="mi-grade"
                  data-ocid="material-issue.input"
                  value={form.grade}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, grade: e.target.value }))
                  }
                  placeholder="e.g. A, B, S-6"
                />
              </div>
            </div>

            {/* Issued Qty */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-qty">Issued Qty (Kg)</Label>
              <Input
                id="mi-qty"
                type="number"
                min="1"
                step="1"
                data-ocid="material-issue.input"
                value={form.issuedQty}
                onChange={(e) =>
                  setForm((p) => ({ ...p, issuedQty: e.target.value }))
                }
                placeholder="e.g. 200"
                required
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-remarks">Remarks</Label>
              <Textarea
                id="mi-remarks"
                data-ocid="material-issue.textarea"
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                placeholder="Optional notes..."
                className="resize-none h-16"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="material-issue.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="material-issue.submit_button"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editItem ? "Update" : "Issue Material"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isShowingLimitedMI && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Showing 25 most recent. Use date filters above to find older entries.
        </p>
      )}

      {/* Bulk Issue Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent
          data-ocid="material-issue.dialog"
          className="sm:max-w-2xl max-h-[90vh] flex flex-col"
        >
          <DialogHeader>
            <DialogTitle>Bulk Material Issue</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleBulkSubmit}
            className="flex flex-col gap-4 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Issue Date</Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={bulkForm.issueDate}
                  onChange={(e) =>
                    setBulkForm((p) => ({ ...p, issueDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select
                  value={bulkForm.warehouse}
                  onValueChange={(v) =>
                    setBulkForm((p) => ({
                      ...p,
                      warehouse: v as Warehouse | "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_OPTIONS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={bulkForm.department}
                  onValueChange={(v) =>
                    setBulkForm((p) => ({ ...p, department: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 max-h-[50vh] border rounded-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider">
                      Material Name
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider w-28">
                      Grade
                    </th>
                    <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider w-36">
                      Quantity (kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialNames.map((mat, i) => (
                    <tr
                      key={mat}
                      className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2 font-medium">{mat}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={bulkMaterialMap.get(mat)?.grade ?? ""}
                          onChange={(e) => {
                            setBulkMaterialMap((prev) => {
                              const next = new Map(prev);
                              const existing = next.get(mat) ?? {
                                qty: "",
                                grade: "",
                              };
                              next.set(mat, {
                                ...existing,
                                grade: e.target.value,
                              });
                              return next;
                            });
                          }}
                          placeholder="e.g. A"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={bulkMaterialMap.get(mat)?.qty ?? ""}
                          onChange={(e) => {
                            setBulkMaterialMap((prev) => {
                              const next = new Map(prev);
                              const existing = next.get(mat) ?? {
                                qty: "",
                                grade: "",
                              };
                              if (e.target.value) {
                                next.set(mat, {
                                  ...existing,
                                  qty: e.target.value,
                                });
                              } else {
                                next.set(mat, { ...existing, qty: "" });
                              }
                              return next;
                            });
                          }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="material-issue.cancel_button"
                onClick={() => setBulkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="material-issue.submit_button"
                disabled={isBulkSubmitting}
              >
                {isBulkSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Issue Materials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Material Issue"
        description="This will permanently delete this issue record and restore the stock back to the warehouse. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
