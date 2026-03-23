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
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useUserRole } from "../hooks/UserRoleContext";
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
import type { Machine, ProductionLog, Shift } from "../types";

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
  { value: "outsideYarn" as MachineType, label: "Outside Yarn" },
];

// ─── Waste field definitions ──────────────────────────────────────────────────
const OE_WASTE_FIELDS = [
  {
    key: "lickerinDropping" as const,
    label: "Lickerin Dropping",
    short: "LK Drop",
  },
  { key: "flatStrips" as const, label: "Flat Strips", short: "Flat" },
  { key: "microdust" as const, label: "Microdust", short: "Dust" },
  { key: "routerFan" as const, label: "Router Fan", short: "R.Fan" },
];

const RING_WASTE_FIELDS = [
  { key: "brd" as const, label: "BRD", short: "BRD" },
  { key: "lrd" as const, label: "LRD", short: "LRD" },
  { key: "flatStripsRing" as const, label: "Flat Strips", short: "Flat" },
  { key: "usableWaste" as const, label: "Usable Waste", short: "Usbl" },
  { key: "microdustRing" as const, label: "Microdust", short: "Dust" },
  { key: "metalWaste" as const, label: "Metal Waste", short: "Metal" },
  { key: "hardWaste" as const, label: "Hard Waste", short: "Hard" },
  { key: "sweepingWaste" as const, label: "Sweeping Waste", short: "Sweep" },
];

type WasteKey =
  | "lickerinDropping"
  | "flatStrips"
  | "microdust"
  | "routerFan"
  | "brd"
  | "lrd"
  | "flatStripsRing"
  | "usableWaste"
  | "microdustRing"
  | "metalWaste"
  | "hardWaste"
  | "sweepingWaste";

const ALL_WASTE_KEYS: WasteKey[] = [
  "lickerinDropping",
  "flatStrips",
  "microdust",
  "routerFan",
  "brd",
  "lrd",
  "flatStripsRing",
  "usableWaste",
  "microdustRing",
  "metalWaste",
  "hardWaste",
  "sweepingWaste",
];

function emptyWaste(): Record<WasteKey, string> {
  const r: Partial<Record<WasteKey, string>> = {};
  for (const k of ALL_WASTE_KEYS) r[k] = "";
  return r as Record<WasteKey, string>;
}

function wasteVal(v: string): bigint | undefined {
  const n = Number.parseFloat(v);
  if (!v || Number.isNaN(n) || n <= 0) return undefined;
  return BigInt(Math.round(n));
}

// Extended type for logs that include waste fields (backend supports these but d.ts is stale)
type ProductionLogFull = ProductionLog & {
  lickerinDropping?: bigint;
  flatStrips?: bigint;
  microdust?: bigint;
  routerFan?: bigint;
  brd?: bigint;
  lrd?: bigint;
  flatStripsRing?: bigint;
  usableWaste?: bigint;
  microdustRing?: bigint;
  metalWaste?: bigint;
  hardWaste?: bigint;
  sweepingWaste?: bigint;
};

function totalWasteKg(log: ProductionLogFull): number {
  const fields: (bigint | undefined)[] = [
    log.lickerinDropping,
    log.flatStrips,
    log.microdust,
    log.routerFan,
    log.brd,
    log.lrd,
    log.flatStripsRing,
    log.usableWaste,
    log.microdustRing,
    log.metalWaste,
    log.hardWaste,
    log.sweepingWaste,
  ];
  return fields.reduce((sum, v) => sum + (v ? Number(v) : 0), 0);
}

function getWasteFieldsForMachineType(machineType: string) {
  if (machineType === MachineType.autocoro) return OE_WASTE_FIELDS;
  if (machineType === MachineType.ringFrame) return RING_WASTE_FIELDS;
  return [];
}

type RowData = { qty: string; eff: string } & Record<WasteKey, string>;

function emptyRow(): RowData {
  return { qty: "", eff: "", ...emptyWaste() };
}

const defaultForm = {
  shift: "morning" as Shift,
  date: new Date().toISOString().substring(0, 10),
  selectedUnit: "",
  machineId: "",
  quantityKg: "",
  efficiencyPercent: "",
  shiftOfficerName: "",
  ...emptyWaste(),
};

// ─── MachineRow sub-component ─────────────────────────────────────────────────
interface MachineRowProps {
  machine: Machine;
  productionOrders: ReturnType<typeof useProductionOrders>["data"];
  rowIndex: number;
  qty: string;
  eff: string;
  wasteData: Record<WasteKey, string>;
  unit: string;
  onRowChange: (machineId: string, qty: string, eff: string) => void;
  onWasteChange: (machineId: string, key: WasteKey, value: string) => void;
}

function MachineRow({
  machine,
  productionOrders,
  rowIndex,
  qty,
  eff,
  wasteData,
  unit,
  onRowChange,
  onWasteChange,
}: MachineRowProps) {
  const orders = productionOrders ?? [];
  const runningLot =
    machine.runningLotNumber != null && machine.runningLotNumber !== ""
      ? machine.runningLotNumber
      : null;
  const runningCount =
    machine.runningCount != null ? machine.runningCount : null;

  const hasInProgressOrder = runningLot
    ? orders.some(
        (o) =>
          o.status === OrderStatus.inProgress && o.lotNumber === runningLot,
      )
    : false;

  const { data: orderBalance, isLoading: isBalanceLoading } =
    useProductionOrderBalance(
      hasInProgressOrder ? BigInt(0) : null,
      hasInProgressOrder ? runningLot : null,
    );

  const enteredQty = qty ? Number(qty) : 0;
  const balanceQty = orderBalance ? Number(orderBalance.balanceQty) : null;
  const isExceedingBalance =
    balanceQty !== null && enteredQty > 0 && enteredQty > balanceQty;
  const isOrderFulfilled = orderBalance?.isFulfilled === true;
  const isDisabled = !runningLot || !hasInProgressOrder || isOrderFulfilled;

  const machineKey = String(Number(machine.id));
  const wasteFields = getWasteFieldsForMachineType(unit);

  return (
    <TableRow
      data-ocid={`logs.bulk.row.${rowIndex}`}
      className={`border-border/40 transition-colors ${
        isExceedingBalance
          ? "bg-amber-50 dark:bg-amber-950/20"
          : "hover:bg-muted/30"
      }`}
    >
      {/* Machine name */}
      <TableCell className="text-sm font-medium">
        <div>
          <span>{machine.name}</span>
          <span className="ml-1 text-xs text-muted-foreground">
            ({machine.machineNumber})
          </span>
        </div>
      </TableCell>

      {/* Count / Lot */}
      <TableCell className="text-sm">
        {runningLot ? (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">
              Ne&nbsp;
              <span className="font-semibold text-foreground">
                {String(runningCount)}
              </span>
            </div>
            <div className="text-xs font-medium text-primary">{runningLot}</div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            No active order
          </span>
        )}
      </TableCell>

      {/* Balance */}
      <TableCell className="text-sm">
        {!runningLot ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : !hasInProgressOrder ? (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-xs"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            No in-progress order
          </Badge>
        ) : isBalanceLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : orderBalance ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              {Number(orderBalance.orderQty)}&nbsp;kg
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              {Number(orderBalance.producedQty)}&nbsp;kg
            </span>
            <span className="text-muted-foreground">|</span>
            <span
              className={`font-semibold ${
                orderBalance.isFulfilled
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {Number(orderBalance.balanceQty)}&nbsp;kg
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Qty input */}
      <TableCell>
        <div className="space-y-1">
          <Input
            type="number"
            min="0"
            value={qty}
            disabled={isDisabled}
            onChange={(e) => onRowChange(machineKey, e.target.value, eff)}
            placeholder={isDisabled ? "—" : "0"}
            className={`w-24 h-8 text-sm ${
              isExceedingBalance
                ? "border-amber-400 focus-visible:ring-amber-400"
                : ""
            }`}
          />
          {isExceedingBalance && (
            <p className="text-[10px] text-amber-600">Max {balanceQty} kg</p>
          )}
        </div>
      </TableCell>

      {/* Efficiency input */}
      <TableCell>
        <Input
          type="number"
          min="0"
          max="100"
          value={eff}
          disabled={isDisabled}
          onChange={(e) => onRowChange(machineKey, qty, e.target.value)}
          placeholder={isDisabled ? "—" : "85"}
          className="w-20 h-8 text-sm"
        />
      </TableCell>

      {/* Waste inputs */}
      {wasteFields.map((wf) => (
        <TableCell key={wf.key}>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={wasteData[wf.key]}
            disabled={isDisabled}
            onChange={(e) => onWasteChange(machineKey, wf.key, e.target.value)}
            placeholder={isDisabled ? "—" : "0"}
            className="w-16 h-8 text-sm"
          />
        </TableCell>
      ))}

      {/* Status icon */}
      <TableCell className="text-center">
        {!runningLot || !hasInProgressOrder ? (
          <X className="w-4 h-4 text-muted-foreground mx-auto" />
        ) : isOrderFulfilled ? (
          <AlertCircle className="w-4 h-4 text-destructive mx-auto" />
        ) : isExceedingBalance ? (
          <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
        ) : enteredQty > 0 ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 mx-auto" />
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ProductionLogs() {
  const { isAdmin } = useUserRole();
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

  // Bulk entry state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    date: new Date().toISOString().substring(0, 10),
    shift: "morning" as Shift,
    selectedUnit: "",
    shiftOfficerName: "",
  });
  const [rowData, setRowData] = useState<Map<string, RowData>>(new Map());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Filter state
  const [filterMachineId, setFilterMachineId] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterMachineId && String(Number(log.machineId)) !== filterMachineId)
        return false;
      if (filterUnit) {
        const machine = machines.find(
          (m) => String(Number(m.id)) === String(Number(log.machineId)),
        );
        if (!machine || machine.machineType !== filterUnit) return false;
      }
      if (filterDateFrom) {
        const logDate = new Date(Number(log.date) / 1_000_000);
        const fromDate = new Date(filterDateFrom);
        if (logDate < fromDate) return false;
      }
      if (filterDateTo) {
        const logDate = new Date(Number(log.date) / 1_000_000);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return false;
      }
      return true;
    });
  }, [
    logs,
    machines,
    filterMachineId,
    filterUnit,
    filterDateFrom,
    filterDateTo,
  ]);

  const hasActiveFilters =
    filterMachineId || filterUnit || filterDateFrom || filterDateTo;

  const LATEST_COUNT_LOGS = 25;
  const displayedLogs = hasActiveFilters
    ? filteredLogs
    : [...filteredLogs]
        .sort((a, b) => (a.id > b.id ? -1 : 1))
        .slice(0, LATEST_COUNT_LOGS);
  const isShowingLimitedLogs =
    !hasActiveFilters && filteredLogs.length > LATEST_COUNT_LOGS;

  function clearFilters() {
    setFilterMachineId("");
    setFilterUnit("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  // Machines filtered by selected unit
  const filteredMachines = form.selectedUnit
    ? machines.filter((m) => m.machineType === form.selectedUnit)
    : [];

  // Machines for bulk dialog
  const bulkMachines = bulkForm.selectedUnit
    ? machines.filter((m) => m.machineType === bulkForm.selectedUnit)
    : [];

  // Waste fields for current form unit
  const formWasteFields = getWasteFieldsForMachineType(form.selectedUnit);
  // Waste fields for current bulk unit
  const bulkWasteFields = getWasteFieldsForMachineType(bulkForm.selectedUnit);

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

  const hasInProgressOrder = machineRunningLot
    ? productionOrders.some(
        (o) =>
          o.status === OrderStatus.inProgress &&
          o.lotNumber === machineRunningLot,
      )
    : false;

  const {
    data: orderBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useProductionOrderBalance(
    hasInProgressOrder ? BigInt(0) : null,
    hasInProgressOrder ? machineRunningLot : null,
    form.machineId || null,
  );

  const enteredQty = form.quantityKg ? Number(form.quantityKg) : 0;
  const balanceQty = orderBalance ? Number(orderBalance.balanceQty) : null;

  const isOrderFulfilled = orderBalance?.isFulfilled === true;
  const isExceedingBalance =
    balanceQty !== null && enteredQty > 0 && enteredQty > balanceQty;
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
    const fullItem = item as ProductionLogFull;
    const waste = emptyWaste();
    for (const k of ALL_WASTE_KEYS) {
      const v = fullItem[k as keyof ProductionLogFull] as bigint | undefined;
      if (v !== undefined) waste[k] = String(Number(v));
    }
    setForm({
      shift: item.shift,
      date: d.toISOString().substring(0, 10),
      selectedUnit: machine?.machineType ?? "",
      machineId: String(Number(item.machineId)),
      quantityKg: String(Number(item.quantityKg)),
      efficiencyPercent: String(Number(item.efficiencyPercent)),
      shiftOfficerName: item.operatorName,
      ...waste,
    });
    setDialogOpen(true);
  }

  function openBulk() {
    setBulkForm({
      date: new Date().toISOString().substring(0, 10),
      shift: "morning" as Shift,
      selectedUnit: "",
      shiftOfficerName: "",
    });
    setRowData(new Map());
    setBulkDialogOpen(true);
  }

  function handleRowChange(machineId: string, qty: string, eff: string) {
    setRowData((prev) => {
      const next = new Map(prev);
      const existing = next.get(machineId) ?? emptyRow();
      next.set(machineId, { ...existing, qty, eff });
      return next;
    });
  }

  function handleWasteChange(machineId: string, key: WasteKey, value: string) {
    setRowData((prev) => {
      const next = new Map(prev);
      const existing = next.get(machineId) ?? emptyRow();
      next.set(machineId, { ...existing, [key]: value });
      return next;
    });
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
      const wasteArgs = {
        lickerinDropping: wasteVal(form.lickerinDropping),
        flatStrips: wasteVal(form.flatStrips),
        microdust: wasteVal(form.microdust),
        routerFan: wasteVal(form.routerFan),
        brd: wasteVal(form.brd),
        lrd: wasteVal(form.lrd),
        flatStripsRing: wasteVal(form.flatStripsRing),
        usableWaste: wasteVal(form.usableWaste),
        microdustRing: wasteVal(form.microdustRing),
        metalWaste: wasteVal(form.metalWaste),
        hardWaste: wasteVal(form.hardWaste),
        sweepingWaste: wasteVal(form.sweepingWaste),
      };
      const args = {
        shift: form.shift,
        date: dateTs,
        machineId: BigInt(form.machineId),
        quantityKg: BigInt(Math.round(Number(form.quantityKg))),
        efficiencyPercent: BigInt(Math.round(Number(form.efficiencyPercent))),
        operatorName: form.shiftOfficerName,
        ...wasteArgs,
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

  async function handleBulkSubmit() {
    if (!bulkForm.selectedUnit || !bulkForm.shiftOfficerName) return;
    const dateTs = BigInt(new Date(bulkForm.date).getTime() * 1_000_000);
    const entriesToSave = bulkMachines.filter((m) => {
      const key = String(Number(m.id));
      const row = rowData.get(key);
      return row && Number(row.qty) > 0;
    });
    if (entriesToSave.length === 0) {
      toast.error("Enter quantity for at least one machine.");
      return;
    }
    setBulkSubmitting(true);
    let saved = 0;
    let failed = 0;
    for (const machine of entriesToSave) {
      const key = String(Number(machine.id));
      const row = rowData.get(key);
      if (!row) continue;
      try {
        await withRetry(() =>
          addMutation.mutateAsync({
            shift: bulkForm.shift,
            date: dateTs,
            machineId: machine.id,
            quantityKg: BigInt(Math.round(Number(row.qty))),
            efficiencyPercent: BigInt(Math.round(Number(row.eff || "0"))),
            operatorName: bulkForm.shiftOfficerName,
            lickerinDropping: wasteVal(row.lickerinDropping),
            flatStrips: wasteVal(row.flatStrips),
            microdust: wasteVal(row.microdust),
            routerFan: wasteVal(row.routerFan),
            brd: wasteVal(row.brd),
            lrd: wasteVal(row.lrd),
            flatStripsRing: wasteVal(row.flatStripsRing),
            usableWaste: wasteVal(row.usableWaste),
            microdustRing: wasteVal(row.microdustRing),
            metalWaste: wasteVal(row.metalWaste),
            hardWaste: wasteVal(row.hardWaste),
            sweepingWaste: wasteVal(row.sweepingWaste),
          }),
        );
        saved++;
      } catch (err) {
        console.error("Bulk entry failed for machine", machine.name, err);
        failed++;
      }
    }
    setBulkSubmitting(false);
    if (saved > 0) {
      toast.success(
        `${saved} log entr${saved === 1 ? "y" : "ies"} saved${failed > 0 ? `, ${failed} failed` : ""}.`,
      );
      setBulkDialogOpen(false);
    } else {
      toast.error("All entries failed. Please try again.");
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
          <div className="flex items-center gap-2">
            <Button
              data-ocid="logs.bulk_button"
              variant="outline"
              onClick={openBulk}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Bulk Entry
            </Button>
            <Button
              data-ocid="logs.primary_button"
              onClick={openAdd}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Log Entry
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1">
          <Label
            htmlFor="filter-unit"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Unit
          </Label>
          <Select
            value={filterUnit || "all"}
            onValueChange={(v) => setFilterUnit(v === "all" ? "" : v)}
          >
            <SelectTrigger
              id="filter-unit"
              data-ocid="logs.unit.select"
              className="w-48 h-8 text-sm"
            >
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {unitOptions.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="filter-machine"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Machine
          </Label>
          <Select
            value={filterMachineId || "all"}
            onValueChange={(v) => setFilterMachineId(v === "all" ? "" : v)}
          >
            <SelectTrigger
              id="filter-machine"
              data-ocid="logs.machine.select"
              className="w-48 h-8 text-sm"
            >
              <SelectValue placeholder="All Machines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines</SelectItem>
              {machines.map((m) => (
                <SelectItem key={String(m.id)} value={String(Number(m.id))}>
                  {m.name} ({m.machineNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="filter-date-from"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            From Date
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            data-ocid="logs.date_from.input"
            className="w-40 h-8 text-sm"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="filter-date-to"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            To Date
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            data-ocid="logs.date_to.input"
            className="w-40 h-8 text-sm"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            data-ocid="logs.clear_filters.button"
            onClick={clearFilters}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

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
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Waste (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No logs match the selected filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {displayedLogs.map((log, idx) => {
                const machine = machines.find((m) => m.id === log.machineId);
                const efficiency = Number(log.efficiencyPercent);
                const waste = totalWasteKg(log as ProductionLogFull);
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
                    <TableCell className="text-sm font-mono-nums">
                      {waste > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {waste}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`logs.edit_button.${idx + 1}`}
                            onClick={() => openEdit(log)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`logs.delete_button.${idx + 1}`}
                            onClick={() => setDeleteId(log.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {isShowingLimitedLogs && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Showing 25 most recent. Use filters above to find older entries.
        </p>
      )}

      {/* ── Single-entry dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="logs.dialog"
          className="!w-screen !h-screen !max-w-none sm:!max-w-none !max-h-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 overflow-y-auto"
        >
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
                    ...emptyWaste(),
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

            {/* Waste Quantities section — only for OE or Ring Spinning */}
            {formWasteFields.length > 0 && (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Waste Quantities (kg)
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    — optional, leave blank if none
                  </span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formWasteFields.map((wf) => (
                    <div key={wf.key} className="space-y-1.5">
                      <Label htmlFor={`lg-waste-${wf.key}`} className="text-xs">
                        {wf.label}
                      </Label>
                      <Input
                        id={`lg-waste-${wf.key}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={form[wf.key as keyof typeof form] as string}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            [wf.key]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* ── Bulk Entry dialog ── */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent
          data-ocid="logs.bulk.dialog"
          className="!w-screen !h-screen !max-w-none sm:!max-w-none !max-h-none !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 !flex !flex-col overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Bulk Production Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto flex-1 pr-1 min-h-0">
            {/* Common header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-date">Date</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  data-ocid="logs.bulk.date.input"
                  value={bulkForm.date}
                  onChange={(e) =>
                    setBulkForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-shift">Shift</Label>
                <Select
                  value={bulkForm.shift}
                  onValueChange={(v) =>
                    setBulkForm((p) => ({ ...p, shift: v as Shift }))
                  }
                >
                  <SelectTrigger
                    id="bulk-shift"
                    data-ocid="logs.bulk.shift.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-unit">Unit</Label>
                <Select
                  value={bulkForm.selectedUnit || "none"}
                  onValueChange={(v) => {
                    setBulkForm((p) => ({
                      ...p,
                      selectedUnit: v === "none" ? "" : v,
                    }));
                    setRowData(new Map());
                  }}
                >
                  <SelectTrigger
                    id="bulk-unit"
                    data-ocid="logs.bulk.unit.select"
                  >
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
              {(bulkForm.selectedUnit === MachineType.autocoro ||
                bulkForm.selectedUnit === MachineType.ringFrame) && (
                <p className="text-xs text-amber-700 flex items-center gap-1 col-span-full">
                  <span>ℹ</span> Waste quantity columns appear to the right of
                  Efficiency — scroll the table right to enter them.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="bulk-officer">Shift Officer Name</Label>
                <Input
                  id="bulk-officer"
                  data-ocid="logs.bulk.officer.input"
                  value={bulkForm.shiftOfficerName}
                  onChange={(e) =>
                    setBulkForm((p) => ({
                      ...p,
                      shiftOfficerName: e.target.value,
                    }))
                  }
                  placeholder="Rajan Kumar"
                />
              </div>
            </div>

            {/* Machine table */}
            {bulkForm.selectedUnit ? (
              bulkMachines.length === 0 ? (
                <div className="rounded-lg border border-border/60 p-8 text-center text-muted-foreground text-sm">
                  No machines found in the selected unit.
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-auto max-h-[calc(100vh-280px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent sticky top-0 bg-card z-10">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">
                          Machine
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">
                          Count / Lot
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">
                          <span className="whitespace-normal leading-tight">
                            Order Qty | Produced | Balance
                          </span>
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">
                          Qty (kg)
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider">
                          Eff %
                        </TableHead>
                        {/* Waste column headers */}
                        {bulkWasteFields.map((wf) => (
                          <TableHead
                            key={wf.key}
                            className="font-semibold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400"
                          >
                            {wf.short}
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">
                          Status
                        </TableHead>
                      </TableRow>
                      {bulkWasteFields.length > 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableHead colSpan={5} className="bg-card border-b" />
                          <TableHead
                            colSpan={bulkWasteFields.length}
                            className="text-amber-700 text-xs font-semibold bg-amber-50 border-b text-center"
                          >
                            Waste Quantities (kg)
                          </TableHead>
                          <TableHead className="bg-card border-b" />
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody>
                      {bulkMachines.map((machine, idx) => {
                        const key = String(Number(machine.id));
                        const row = rowData.get(key) ?? emptyRow();
                        return (
                          <MachineRow
                            key={String(machine.id)}
                            machine={machine}
                            productionOrders={productionOrders}
                            rowIndex={idx + 1}
                            qty={row.qty}
                            eff={row.eff}
                            wasteData={row}
                            unit={bulkForm.selectedUnit}
                            onRowChange={handleRowChange}
                            onWasteChange={handleWasteChange}
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-10 text-center">
                <Layers className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select a unit above to see all machines and enter production
                  quantities at once.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="logs.bulk.cancel_button"
              onClick={() => setBulkDialogOpen(false)}
              disabled={bulkSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-ocid="logs.bulk.submit_button"
              onClick={handleBulkSubmit}
              disabled={
                bulkSubmitting ||
                !bulkForm.selectedUnit ||
                !bulkForm.shiftOfficerName
              }
            >
              {bulkSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Submit All"
              )}
            </Button>
          </DialogFooter>
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
