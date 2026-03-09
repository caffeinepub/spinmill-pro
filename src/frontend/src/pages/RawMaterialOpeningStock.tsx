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
import { Loader2, PackageSearch, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RawMaterial, Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddRawMaterialOpeningStock,
  useDeleteRawMaterialOpeningStock,
  useRawMaterialOpeningStock,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function dateStringToNs(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * BigInt(1_000_000);
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

// ─── Default Form ─────────────────────────────────────────────────────────────

const defaultForm = {
  materialName: "",
  supplier: "",
  grade: "",
  warehouse: "" as Warehouse | "",
  weightKg: "",
  date: todayStr(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RawMaterialOpeningStock() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { materialNames } = useDropdownOptionsContext();

  const { data: entries = [], isLoading } = useRawMaterialOpeningStock();
  const addMutation = useAddRawMaterialOpeningStock();
  const deleteMutation = useDeleteRawMaterialOpeningStock();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openAdd() {
    setForm(defaultForm);
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
    if (!isLoggedIn) {
      toast.error("Please sign in to save data");
      return;
    }
    if (!form.warehouse) {
      toast.error("Please select a warehouse");
      return;
    }
    if (!form.materialName) {
      toast.error("Please select a material name");
      return;
    }
    try {
      await withRetry(() =>
        addMutation.mutateAsync({
          materialName: form.materialName,
          supplier: form.supplier,
          grade: form.grade,
          weightKg: BigInt(Math.round(Number(form.weightKg))),
          warehouse: form.warehouse as Warehouse,
          date: dateStringToNs(form.date),
        }),
      );
      toast.success("Opening stock entry added");
      setDialogOpen(false);
    } catch (error) {
      console.error("Operation failed:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(
        isLoggedIn ? msg || "Operation failed" : "Please sign in to save data",
      );
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await withRetry(() => deleteMutation.mutateAsync(deleteId));
      toast.success("Opening stock entry deleted");
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Raw Material Opening Stock"
        description="Enter existing raw material stock that arrived before the system was set up"
        action={
          <Button
            data-ocid="rm-opening.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Opening Stock
          </Button>
        }
      />

      <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
        <strong>Note:</strong> Opening stock entries directly add stock to the
        selected warehouse without requiring a Purchase Order. Use this to enter
        your existing inventory before starting regular Inward entries.
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            data-ocid="rm-opening.empty_state"
            icon={<PackageSearch className="w-7 h-7" />}
            title="No opening stock entries yet"
            description="Add your existing raw material stock to get started."
            actionLabel="Add Opening Stock"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Material Name
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Grade
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Warehouse
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Quantity (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date Received
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: RawMaterial, idx: number) => (
                <TableRow
                  key={String(entry.id)}
                  data-ocid={`rm-opening.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-medium text-sm">
                    {entry.lotNumber || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.supplier || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.grade || "—"}
                  </TableCell>
                  <TableCell>
                    <WarehouseBadge warehouse={entry.warehouse} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {Number(entry.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.dateReceived)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`rm-opening.delete_button.${idx + 1}`}
                      onClick={() => setDeleteId(entry.id)}
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="rm-opening.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Raw Material Opening Stock</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rm-os-material">Material Name</Label>
              <Select
                value={form.materialName}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, materialName: v }))
                }
              >
                <SelectTrigger
                  id="rm-os-material"
                  data-ocid="rm-opening.select"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rm-os-supplier">Supplier</Label>
                <Input
                  id="rm-os-supplier"
                  data-ocid="rm-opening.input"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, supplier: e.target.value }))
                  }
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rm-os-grade">Grade</Label>
                <Input
                  id="rm-os-grade"
                  data-ocid="rm-opening.input"
                  value={form.grade}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, grade: e.target.value }))
                  }
                  placeholder="e.g. A, B, Premium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rm-os-warehouse">Warehouse</Label>
                <Select
                  value={form.warehouse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, warehouse: v as Warehouse }))
                  }
                >
                  <SelectTrigger
                    id="rm-os-warehouse"
                    data-ocid="rm-opening.select"
                  >
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oeRawMaterial">
                      OE Raw Material
                    </SelectItem>
                    <SelectItem value="ringRawMaterial">
                      Ring Raw Material
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rm-os-qty">Quantity (kg)</Label>
                <Input
                  id="rm-os-qty"
                  type="number"
                  min="1"
                  step="1"
                  data-ocid="rm-opening.input"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-os-date">Date Received</Label>
              <Input
                id="rm-os-date"
                type="date"
                data-ocid="rm-opening.input"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="rm-opening.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="rm-opening.submit_button"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Opening Stock Entry"
        description="This will permanently delete this opening stock entry. The deducted warehouse stock will not be automatically restored."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
