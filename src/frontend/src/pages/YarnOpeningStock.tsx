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
import { Loader2, Package2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddYarnOpeningStock,
  useDeleteYarnOpeningStock,
  useYarnOpeningStock,
} from "../hooks/useQueries";
import type {
  EndUse,
  ProductType,
  SpinningUnit,
  YarnOpeningStockRecord,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUnit(su: string): string {
  if (su === "openend") return "Openend";
  if (su === "ringSpinning") return "Ring Spinning";
  return su;
}

function formatProductType(pt: string): string {
  if (pt === "lt") return "LT";
  return pt.charAt(0).toUpperCase() + pt.slice(1);
}

function formatEndUse(eu: string): string {
  if (eu === "tfo") return "TFO";
  return eu.charAt(0).toUpperCase() + eu.slice(1);
}

function UnitBadge({ unit }: { unit: string }) {
  const isOE = unit === "openend";
  return (
    <Badge
      variant="outline"
      className={
        isOE
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
          : "bg-sky-50 text-sky-700 border-sky-200 text-xs"
      }
    >
      {formatUnit(unit)}
    </Badge>
  );
}

// ─── Default Form ─────────────────────────────────────────────────────────────

const defaultForm = {
  lotNumber: "",
  yarnCountNe: "",
  spinningUnit: "" as SpinningUnit | "",
  productType: "" as ProductType | "",
  endUse: "" as EndUse | "",
  weightKg: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YarnOpeningStock() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: entries = [], isLoading } = useYarnOpeningStock() as {
    data: YarnOpeningStockRecord[];
    isLoading: boolean;
  };
  const addMutation = useAddYarnOpeningStock();
  const deleteMutation = useDeleteYarnOpeningStock();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openAdd() {
    setForm(defaultForm);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("Please sign in to save data");
      return;
    }
    if (!form.spinningUnit) {
      toast.error("Please select a unit");
      return;
    }
    if (!form.productType) {
      toast.error("Please select a product type");
      return;
    }
    if (!form.endUse) {
      toast.error("Please select an end use");
      return;
    }
    try {
      await addMutation.mutateAsync({
        lotNumber: form.lotNumber,
        yarnCountNe: BigInt(Math.round(Number(form.yarnCountNe))),
        spinningUnit: form.spinningUnit as SpinningUnit,
        productType: form.productType as ProductType,
        endUse: form.endUse as EndUse,
        weightKg: BigInt(Math.round(Number(form.weightKg))),
      });
      toast.success("Yarn opening stock entry added");
      setDialogOpen(false);
    } catch {
      toast.error(
        isLoggedIn ? "Operation failed" : "Please sign in to save data",
      );
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Yarn opening stock entry deleted");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yarn Opening Stock"
        description="Enter existing yarn stock that was available before the system was set up"
        action={
          <Button
            data-ocid="yarn-opening.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Opening Stock
          </Button>
        }
      />

      <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
        <strong>Note:</strong> Yarn opening stock entries directly add stock to
        the Yarn Inventory without requiring a Production or Packing entry. Use
        this to enter your existing yarn inventory before starting regular
        operations.
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
            data-ocid="yarn-opening.empty_state"
            icon={<Package2 className="w-7 h-7" />}
            title="No yarn opening stock entries yet"
            description="Add your existing yarn inventory to get started."
            actionLabel="Add Opening Stock"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Unit
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Product Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  End Use
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Quantity (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow
                  key={String(entry.id)}
                  data-ocid={`yarn-opening.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono font-medium text-sm">
                    {entry.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {Number(entry.yarnCountNe)}
                  </TableCell>
                  <TableCell>
                    <UnitBadge unit={String(entry.spinningUnit)} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {String(entry.productType)
                      ? formatProductType(String(entry.productType))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {String(entry.endUse)
                      ? formatEndUse(String(entry.endUse))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {Number(entry.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`yarn-opening.delete_button.${idx + 1}`}
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
        <DialogContent data-ocid="yarn-opening.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Yarn Opening Stock</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="yarn-os-lot">Lot Number</Label>
                <Input
                  id="yarn-os-lot"
                  data-ocid="yarn-opening.input"
                  value={form.lotNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lotNumber: e.target.value }))
                  }
                  placeholder="e.g. LOT-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yarn-os-count">Count (Ne)</Label>
                <Input
                  id="yarn-os-count"
                  type="number"
                  min="1"
                  step="1"
                  data-ocid="yarn-opening.input"
                  value={form.yarnCountNe}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yarnCountNe: e.target.value }))
                  }
                  placeholder="e.g. 30"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yarn-os-unit">Unit</Label>
              <Select
                value={form.spinningUnit}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, spinningUnit: v as SpinningUnit }))
                }
              >
                <SelectTrigger
                  id="yarn-os-unit"
                  data-ocid="yarn-opening.select"
                >
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openend">Openend</SelectItem>
                  <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="yarn-os-product-type">Product Type</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, productType: v as ProductType }))
                  }
                >
                  <SelectTrigger
                    id="yarn-os-product-type"
                    data-ocid="yarn-opening.select"
                  >
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carded">Carded</SelectItem>
                    <SelectItem value="combed">Combed</SelectItem>
                    <SelectItem value="polyester">Polyester</SelectItem>
                    <SelectItem value="bamboo">Bamboo</SelectItem>
                    <SelectItem value="viscose">Viscose</SelectItem>
                    <SelectItem value="lt">LT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yarn-os-end-use">End Use</Label>
                <Select
                  value={form.endUse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, endUse: v as EndUse }))
                  }
                >
                  <SelectTrigger
                    id="yarn-os-end-use"
                    data-ocid="yarn-opening.select"
                  >
                    <SelectValue placeholder="Select end use..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warp">Warp</SelectItem>
                    <SelectItem value="weft">Weft</SelectItem>
                    <SelectItem value="pile">Pile</SelectItem>
                    <SelectItem value="ground">Ground</SelectItem>
                    <SelectItem value="tfo">TFO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="yarn-os-qty">Quantity (kg)</Label>
              <Input
                id="yarn-os-qty"
                type="number"
                min="1"
                step="1"
                data-ocid="yarn-opening.input"
                value={form.weightKg}
                onChange={(e) =>
                  setForm((p) => ({ ...p, weightKg: e.target.value }))
                }
                placeholder="500"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="yarn-opening.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="yarn-opening.submit_button"
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
        title="Delete Yarn Opening Stock Entry"
        description="This will permanently delete this yarn opening stock entry. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
