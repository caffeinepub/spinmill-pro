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
  Loader2,
  PackageOpen,
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
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateMaterialIssue,
  useDeleteMaterialIssue,
  useMaterialIssues,
  useWarehouseStock,
} from "../hooks/useQueries";

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
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { materialNames, departments } = useDropdownOptionsContext();

  const { data: issues = [], isLoading } = useMaterialIssues();
  const { data: warehouseStock = [] } = useWarehouseStock();
  const createMutation = useCreateMaterialIssue();
  const deleteMutation = useDeleteMaterialIssue();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
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
    setForm({ ...defaultForm, issueNumber: generateIssueNumber() });
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
    const qty = Number(form.issuedQty);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      await withRetry(() =>
        createMutation.mutateAsync({
          department: form.department,
          warehouse: form.warehouse as Warehouse,
          materialName: form.materialName.trim(),
          grade: form.grade.trim(),
          issuedQty: BigInt(Math.round(qty)),
          remarks: form.remarks.trim(),
        }),
      );
      toast.success(
        `Issue ${form.issueNumber} created — stock deducted from ${warehouseLabel(form.warehouse as Warehouse)}`,
      );
      setDialogOpen(false);
    } catch (err) {
      console.error("Operation failed:", err);
      if (!isLoggedIn) {
        toast.error("Please sign in to save data");
      } else {
        // Extract meaningful message from backend error
        const msg = err instanceof Error ? err.message : String(err);
        // Backend trap messages are often in format "Reject text: ..."
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
          <Button
            data-ocid="material-issue.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Issue
          </Button>
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
        ) : issues.length === 0 ? (
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
              {issues.map((issue, idx) => (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`material-issue.delete_button.${idx + 1}`}
                      onClick={() => setDeleteId(issue.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* New Issue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="material-issue.dialog"
          className="sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-primary" />
              New Material Issue
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
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Issue Material
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
