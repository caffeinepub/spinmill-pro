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
import { Progress } from "@/components/ui/progress";
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
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
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
  useAddProductionLog,
  useDeleteProductionLog,
  useMachines,
  useProductionLogs,
  useProductionOrderBalance,
  useProductionOrders,
  useUpdateProductionLog,
} from "../hooks/useQueries";
import { MachineType, OrderStatus } from "../types";
import type { ProductionLog, Shift } from "../types";

const shiftLabels: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
};

const shiftColors: Record<string, string> = {
  morning: "status-running",
  afternoon: "status-idle",
  night: "status-inprogress",
};

// Unit labels matching what Machines.tsx uses
const unitOptions = [
  { value: MachineType.autocoro, label: "OE Spinning" },
  { value: MachineType.ringFrame, label: "Ring Spinning" },
  { value: MachineType.winding, label: "TFO" },
];

const defaultForm = {
  shift: "morning" as Shift,
  date: new Date().toISOString().substring(0, 10),
  selectedUnit: "",
  machineId: "",
  quantityKg: "",
  efficiencyPercent: "",
  shiftOfficerName: "",
};

export default function ProductionLogs() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: logs = [], isLoading } = useProductionLogs();
  const { data: machines = [] } = useMachines();
  const { data: productionOrders = [] } = useProductionOrders();
  const addMutation = useAddProductionLog();
  const updateMutation = useUpdateProductionLog();
  const deleteMutation = useDeleteProductionLog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductionLog | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Machines filtered by selected unit
  const filteredMachines = form.selectedUnit
    ? machines.filter((m) => m.machineType === form.selectedUnit)
    : [];

  // Derive selected machine and its running count/lot
  const selectedMachine = form.machineId
    ? machines.find((m) => String(Number(m.id)) === form.machineId)
    : undefined;

  const machineRunningCount =
    selectedMachine?.runningCount != null ? selectedMachine.runningCount : null;
  const machineRunningLot =
    selectedMachine?.runningLotNumber != null
      ? selectedMachine.runningLotNumber
      : null;
  const hasMachineCountLot =
    machineRunningLot !== null && machineRunningLot !== "";

  // Check if there's an "inProgress" production order for the machine's lot number only
  // (yarnCountNe comparison is avoided because count values like "30/1" make Number() return NaN)
  const hasInProgressOrder = machineRunningLot
    ? productionOrders.some(
        (o) =>
          o.status === OrderStatus.inProgress &&
          o.lotNumber === machineRunningLot,
      )
    : false;

  // Fetch production order balance based on machine's lot number
  // (only fetch if there is an in-progress order)
  // yarnCountNe is passed as 0n since the backend only uses lotNumber for lookup
  const {
    data: orderBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useProductionOrderBalance(
    hasInProgressOrder ? BigInt(0) : null,
    hasInProgressOrder ? machineRunningLot : null,
  );

  const enteredQty = form.quantityKg ? Number(form.quantityKg) : 0;
  const balanceQty = orderBalance ? Number(orderBalance.balanceQty) : null;

  // Determine if submission should be blocked
  const isOrderFulfilled = orderBalance?.isFulfilled === true;
  const isExceedingBalance =
    balanceQty !== null && enteredQty > 0 && enteredQty > balanceQty;
  // Also block if no in-progress order found for this machine's count+lot
  const isNoInProgressOrder = hasMachineCountLot && !hasInProgressOrder;
  const isSubmitBlocked =
    isNoInProgressOrder ||
    (hasMachineCountLot && orderBalance !== undefined && orderBalance !== null
      ? isOrderFulfilled || isExceedingBalance
      : false);

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: ProductionLog) {
    setEditItem(item);
    const d = new Date(Number(item.date) / 1_000_000);
    const machine = machines.find((m) => m.id === item.machineId);
    setForm({
      shift: item.shift,
      date: d.toISOString().substring(0, 10),
      selectedUnit: machine?.machineType ?? "",
      machineId: String(Number(item.machineId)),
      quantityKg: String(Number(item.quantityKg)),
      efficiencyPercent: String(Number(item.efficiencyPercent)),
      shiftOfficerName: item.operatorName,
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
    if (isSubmitBlocked) return;
    const dateTs = BigInt(new Date(form.date).getTime() * 1_000_000);
    try {
      const args = {
        shift: form.shift,
        date: dateTs,
        machineId: BigInt(form.machineId),
        quantityKg: BigInt(Math.round(Number(form.quantityKg))),
        efficiencyPercent: BigInt(Math.round(Number(form.efficiencyPercent))),
        operatorName: form.shiftOfficerName,
      };
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({ id: editItem.id, ...args }),
        );
        toast.success("Production log updated");
      } else {
        await withRetry(() => addMutation.mutateAsync(args));
        toast.success("Production log added");
      }
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
      toast.success("Log deleted");
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

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Production Logs"
        description="Shift-wise production records and efficiency tracking"
        action={
          <Button
            data-ocid="logs.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Log Entry
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
        ) : logs.length === 0 ? (
          <EmptyState
            data-ocid="logs.empty_state"
            icon={<FileText className="w-7 h-7" />}
            title="No production logs"
            description="Start logging production data by shift to track efficiency and output."
            actionLabel="Add Log Entry"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Shift
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Machine
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Shift Officer
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Efficiency
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, idx) => {
                const machine = machines.find((m) => m.id === log.machineId);
                const efficiency = Number(log.efficiencyPercent);
                return (
                  <TableRow
                    key={String(log.id)}
                    data-ocid={`logs.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-sm">
                      {new Date(
                        Number(log.date) / 1_000_000,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${shiftColors[log.shift]}`}
                      >
                        {shiftLabels[log.shift]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {machine ? machine.name : `#${Number(log.machineId)}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.operatorName ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(log.quantityKg)}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress value={efficiency} className="h-1.5 flex-1" />
                        <span className="text-xs font-mono-nums text-muted-foreground w-9">
                          {efficiency}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`logs.edit_button.${idx + 1}`}
                          onClick={() => openEdit(log)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`logs.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(log.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="logs.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Log Entry" : "Add Production Log"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date & Shift */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lg-date">Date</Label>
                <Input
                  id="lg-date"
                  type="date"
                  data-ocid="logs.input"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lg-shift">Shift</Label>
                <Select
                  value={form.shift}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, shift: v as Shift }))
                  }
                >
                  <SelectTrigger id="lg-shift" data-ocid="logs.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label htmlFor="lg-unit">Unit</Label>
              <Select
                value={form.selectedUnit || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    selectedUnit: v === "none" ? "" : v,
                    machineId: "",
                    quantityKg: "",
                  }))
                }
              >
                <SelectTrigger id="lg-unit" data-ocid="logs.unit.select">
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Machine — shown only after a unit is selected */}
            {form.selectedUnit && (
              <div className="space-y-1.5">
                <Label htmlFor="lg-machine">Machine</Label>
                <Select
                  value={form.machineId || "none"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      machineId: v === "none" ? "" : v,
                      quantityKg: "",
                    }))
                  }
                >
                  <SelectTrigger id="lg-machine">
                    <SelectValue placeholder="Select machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMachines.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No machines in this unit
                      </SelectItem>
                    ) : (
                      filteredMachines.map((m) => (
                        <SelectItem
                          key={String(m.id)}
                          value={String(Number(m.id))}
                        >
                          {m.name} ({m.machineNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-populated Count (Ne) and Lot Number */}
            {hasMachineCountLot && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Count (Ne)
                  </Label>
                  <div className="flex items-center h-9 px-3 rounded-md border border-border/60 bg-muted/40">
                    <Badge
                      variant="secondary"
                      className="text-sm font-semibold font-mono-nums bg-primary/10 text-primary border-primary/20"
                    >
                      Ne {String(machineRunningCount)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Lot Number
                  </Label>
                  <div className="flex items-center h-9 px-3 rounded-md border border-border/60 bg-muted/40">
                    <span className="text-sm font-medium text-foreground">
                      {machineRunningLot}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Shift Officer */}
            <div className="space-y-1.5">
              <Label htmlFor="lg-officer">Shift Officer Name</Label>
              <Input
                id="lg-officer"
                value={form.shiftOfficerName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, shiftOfficerName: e.target.value }))
                }
                placeholder="Rajan Kumar"
                required
              />
            </div>

            {/* Qty + Efficiency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lg-qty">Quantity (kg)</Label>
                <Input
                  id="lg-qty"
                  type="number"
                  min="0"
                  value={form.quantityKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantityKg: e.target.value }))
                  }
                  placeholder="250"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lg-eff">Efficiency %</Label>
                <Input
                  id="lg-eff"
                  type="number"
                  min="0"
                  max="100"
                  value={form.efficiencyPercent}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      efficiencyPercent: e.target.value,
                    }))
                  }
                  placeholder="85"
                  required
                />
              </div>
            </div>

            {/* Production Order Balance Panel */}
            {hasMachineCountLot && (
              <div
                data-ocid="logs.panel"
                className={`rounded-md border p-3 space-y-2 text-sm transition-colors ${
                  isNoInProgressOrder
                    ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                    : isOrderFulfilled
                      ? "bg-destructive/5 border-destructive/30"
                      : isExceedingBalance
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                        : "bg-muted/40 border-border/60"
                }`}
              >
                {isNoInProgressOrder ? (
                  <div
                    data-ocid="logs.error_state"
                    className="flex items-start gap-2 text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">
                      No <strong>In Progress</strong> production order found for
                      Count Ne&nbsp;
                      <strong>{String(machineRunningCount)}</strong> / Lot&nbsp;
                      <strong>{machineRunningLot}</strong>. Only orders with
                      status "In Progress" can be used for production entry.
                    </span>
                  </div>
                ) : isBalanceLoading ? (
                  <div
                    data-ocid="logs.loading_state"
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">
                      Fetching production order balance…
                    </span>
                  </div>
                ) : isBalanceError || orderBalance === undefined ? (
                  <div
                    data-ocid="logs.error_state"
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">
                      Unable to fetch balance. Please try again.
                    </span>
                  </div>
                ) : orderBalance === null ? (
                  <div
                    data-ocid="logs.error_state"
                    className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">
                      No matching production order found for Count Ne&nbsp;
                      <strong>{String(machineRunningCount)}</strong> / Lot&nbsp;
                      <strong>{machineRunningLot}</strong>.
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Balance summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Order Qty
                        </p>
                        <p className="font-semibold font-mono-nums text-foreground">
                          {Number(orderBalance.orderQty)}&nbsp;kg
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Produced
                        </p>
                        <p className="font-semibold font-mono-nums text-foreground">
                          {Number(orderBalance.producedQty)}&nbsp;kg
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                          Balance
                        </p>
                        <p
                          className={`font-semibold font-mono-nums ${
                            orderBalance.isFulfilled
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {Number(orderBalance.balanceQty)}&nbsp;kg
                        </p>
                      </div>
                    </div>

                    {/* Warning / Blocked state */}
                    {isOrderFulfilled && (
                      <div
                        data-ocid="logs.error_state"
                        className="flex items-start gap-2 pt-1 border-t border-destructive/20"
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-destructive mt-0.5" />
                        <p className="text-xs text-destructive">
                          Production order for this Count / Lot is already
                          complete. No further entries can be added.
                        </p>
                      </div>
                    )}
                    {!isOrderFulfilled && isExceedingBalance && (
                      <div
                        data-ocid="logs.error_state"
                        className="flex items-start gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/40"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Entered quantity ({enteredQty} kg) exceeds the balance
                          ({Number(orderBalance.balanceQty)} kg). Please reduce
                          the quantity.
                        </p>
                      </div>
                    )}
                    {!isOrderFulfilled &&
                      !isExceedingBalance &&
                      enteredQty > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            Remaining after this entry:{" "}
                            <strong>
                              {Number(orderBalance.balanceQty) - enteredQty} kg
                            </strong>
                          </p>
                        </div>
                      )}
                  </>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="logs.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="logs.submit_button"
                disabled={
                  isPending ||
                  !form.selectedUnit ||
                  !form.machineId ||
                  isSubmitBlocked
                }
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Add Log"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Log Entry"
        description="This will permanently delete this production log entry."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
