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
  AlertCircle,
  AlertTriangle,
  Box,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreatePackingEntry,
  useDeletePackingEntry,
  useNextPackingNumber,
  usePackingBalance,
  usePackingEntries,
  useProductionOrders,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUnit(unit: string): string {
  if (unit === "openend") return "Openend";
  if (unit === "ringSpinning") return "Ring Spinning";
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

function formatProductType(pt: string): string {
  if (pt === "lt") return "LT";
  return pt.charAt(0).toUpperCase() + pt.slice(1);
}

function formatEndUse(eu: string): string {
  if (eu === "tfo") return "TFO";
  return eu.charAt(0).toUpperCase() + eu.slice(1);
}

// ─── Balance Panel ────────────────────────────────────────────────────────────

interface BalancePanelProps {
  lotNumber: string;
  enteredQty: number;
}

function BalancePanel({ lotNumber, enteredQty }: BalancePanelProps) {
  const {
    data: balance,
    isLoading,
    isError,
  } = usePackingBalance(lotNumber || null);

  const availableKg = balance ? Number(balance.availableKg) : null;
  const isExceeding =
    availableKg !== null && enteredQty > 0 && enteredQty > availableKg;
  const isZeroBalance = availableKg !== null && availableKg <= 0;

  const panelClass = isZeroBalance
    ? "bg-destructive/5 border-destructive/30"
    : isExceeding
      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
      : "bg-muted/40 border-border/60";

  return (
    <div
      data-ocid="packing.panel"
      className={`rounded-md border p-3 space-y-2 text-sm transition-colors ${panelClass}`}
    >
      {isLoading ? (
        <div
          data-ocid="packing.loading_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Fetching yarn balance…</span>
        </div>
      ) : isError ? (
        <div
          data-ocid="packing.error_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="text-xs">
            Unable to fetch balance. Please try again.
          </span>
        </div>
      ) : balance === null || balance === undefined ? (
        <div
          data-ocid="packing.error_state"
          className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs">
            No yarn inventory found for Lot <strong>{lotNumber}</strong>.
          </span>
        </div>
      ) : (
        <>
          {/* Yarn Specifications */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Count (Ne)
              </p>
              <Badge
                variant="secondary"
                className="text-xs font-semibold font-mono bg-primary/10 text-primary border-primary/20"
              >
                Ne {String(balance.yarnCountNe)}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Unit
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatUnit(balance.spinningUnit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Product Type
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatProductType(balance.productType)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                End Use
              </p>
              <p className="text-sm font-medium text-foreground">
                {formatEndUse(balance.endUse)}
              </p>
            </div>
          </div>

          {/* Balance row */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Available Balance
            </p>
            <p
              className={`font-semibold font-mono text-sm ${
                isZeroBalance
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {Number(balance.availableKg)} kg
            </p>
          </div>

          {/* Total packed */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total Packed
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              {Number(balance.totalPackedKg)} kg
            </p>
          </div>

          {/* Warning states */}
          {isZeroBalance && (
            <div
              data-ocid="packing.error_state"
              className="flex items-start gap-2 pt-1 border-t border-destructive/20"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-destructive mt-0.5" />
              <p className="text-xs text-destructive">
                No available yarn balance for this lot. No further packing
                entries can be added.
              </p>
            </div>
          )}
          {!isZeroBalance && isExceeding && (
            <div
              data-ocid="packing.error_state"
              className="flex items-start gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/40"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Entered quantity ({enteredQty} kg) exceeds the available balance
                ({availableKg} kg). Please reduce the quantity.
              </p>
            </div>
          )}
          {!isZeroBalance && !isExceeding && enteredQty > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Remaining after this entry:{" "}
                <strong>{availableKg! - enteredQty} kg</strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const defaultForm = {
  date: new Date().toISOString().substring(0, 10),
  lotNumber: "",
  quantityKg: "",
  remarks: "",
};

export default function PackingEntryPage() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: entries = [], isLoading } = usePackingEntries();
  const { data: productionOrders = [] } = useProductionOrders();
  const createMutation = useCreatePackingEntry();
  const deleteMutation = useDeletePackingEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Auto-generated packing number
  const { data: nextPackingNumber } = useNextPackingNumber(dialogOpen);

  // Unique lot numbers from production orders (each PO has a lot number)
  const lotNumbers = Array.from(
    new Set(productionOrders.map((po) => po.lotNumber).filter(Boolean)),
  ).sort();

  // Balance for the selected lot
  const { data: balance } = usePackingBalance(form.lotNumber || null);

  const enteredQty = form.quantityKg ? Number(form.quantityKg) : 0;
  const availableKg = balance ? Number(balance.availableKg) : null;
  const isExceeding =
    availableKg !== null && enteredQty > 0 && enteredQty > availableKg;
  const isZeroBalance = availableKg !== null && availableKg <= 0;
  const isSubmitBlocked =
    !form.lotNumber ||
    !form.quantityKg ||
    isExceeding ||
    isZeroBalance ||
    (balance === null && form.lotNumber !== "");

  function openAdd() {
    setForm(defaultForm);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitBlocked) return;
    const packingDateTs = BigInt(new Date(form.date).getTime() * 1_000_000);
    try {
      await createMutation.mutateAsync({
        lotNumber: form.lotNumber,
        quantityKg: BigInt(Math.round(Number(form.quantityKg))),
        remarks: form.remarks,
        packingDate: packingDateTs,
      });
      toast.success("Packing entry saved");
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
      toast.success("Entry deleted");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  const isPending = createMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Packing Entry"
        description="Daily packing entries with automatic yarn specification fetch"
        action={
          <Button
            data-ocid="packing.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Packing Entry
          </Button>
        }
      />

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            data-ocid="packing.empty_state"
            icon={<Box className="w-7 h-7" />}
            title="No packing entries"
            description="Start recording daily packing entries to track packed yarn quantities."
            actionLabel="New Packing Entry"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Packing #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
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
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Qty (kg)
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
              {entries.map((entry, idx) => (
                <TableRow
                  key={String(entry.id)}
                  data-ocid={`packing.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {entry.packingNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(
                      Number(entry.packingDate) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {entry.lotNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    Ne {String(entry.yarnCountNe)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUnit(entry.spinningUnit)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatProductType(entry.productType)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatEndUse(entry.endUse)}
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-sm">
                    {Number(entry.quantityKg)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {entry.remarks || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`packing.delete_button.${idx + 1}`}
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

      {/* New Packing Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="packing.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Packing Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Packing Number (auto-generated) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Packing Number (Auto-generated)
              </Label>
              <div className="flex items-center h-9 px-3 rounded-md border border-border/60 bg-muted/40">
                <span className="text-sm font-mono font-medium text-primary">
                  {nextPackingNumber ?? "Loading…"}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pk-date">Date</Label>
              <Input
                id="pk-date"
                type="date"
                data-ocid="packing.input"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                required
              />
            </div>

            {/* Lot Number */}
            <div className="space-y-1.5">
              <Label htmlFor="pk-lot">Lot Number</Label>
              <Select
                value={form.lotNumber || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    lotNumber: v === "none" ? "" : v,
                    quantityKg: "",
                  }))
                }
              >
                <SelectTrigger id="pk-lot" data-ocid="packing.select">
                  <SelectValue placeholder="Select lot number..." />
                </SelectTrigger>
                <SelectContent>
                  {lotNumbers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No yarn lots available
                    </SelectItem>
                  ) : (
                    lotNumbers.map((lot) => (
                      <SelectItem key={lot} value={lot}>
                        {lot}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Balance Panel — shown when lot is selected */}
            {form.lotNumber && (
              <BalancePanel
                lotNumber={form.lotNumber}
                enteredQty={enteredQty}
              />
            )}

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="pk-qty">Quantity (kg)</Label>
              <Input
                id="pk-qty"
                type="number"
                min="1"
                data-ocid="packing.input"
                value={form.quantityKg}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantityKg: e.target.value }))
                }
                placeholder="e.g. 500"
                disabled={!form.lotNumber || isZeroBalance}
                required
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="pk-remarks">Remarks (optional)</Label>
              <Textarea
                id="pk-remarks"
                data-ocid="packing.textarea"
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                placeholder="Any notes about this packing entry..."
                rows={2}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="packing.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="packing.submit_button"
                disabled={isPending || isSubmitBlocked}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Packing Entry"
        description="This will permanently delete this packing entry and restore the yarn balance."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
