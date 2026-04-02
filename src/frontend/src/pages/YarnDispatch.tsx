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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  CheckCircle2,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateDispatchEntry,
  useDeleteDispatchEntry,
  useDispatchBalance,
  useDispatchEntries,
  usePackingEntries,
  useProductionOrders,
  useUpdateDispatchEntry,
  useYarnCountLabels,
  useYarnOpeningStock,
} from "../hooks/useQueries";
import type {
  DispatchDestination,
  DispatchEntry as DispatchEntryType,
} from "../types";

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

function formatDestination(
  dest: string,
  labelMap: Record<string, string>,
): string {
  return labelMap[dest] ?? dest;
}

// ─── Lot Number Combobox ──────────────────────────────────────────────────────

interface LotComboboxProps {
  value: string;
  options: string[];
  onChange: (lot: string) => void;
}

function LotCombobox({ value, options, onChange }: LotComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
  }

  function handleSelect(lot: string) {
    onChange(lot);
    setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="dp-lot"
          data-ocid="dispatch.search_input"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Search lot number..."
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md text-sm">
          {filtered.map((lot) => (
            <li
              key={lot}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(lot);
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-muted transition-colors font-mono ${
                lot === value ? "bg-primary/10 text-primary font-semibold" : ""
              }`}
            >
              {lot}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && value.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md text-sm px-3 py-2 text-muted-foreground">
          No matching lot numbers
        </div>
      )}
    </div>
  );
}

// ─── Dispatch Balance Panel ───────────────────────────────────────────────────

interface DispatchBalancePanelProps {
  lotNumber: string;
  enteredQty: number;
}

function DispatchBalancePanel({
  lotNumber,
  enteredQty,
}: DispatchBalancePanelProps) {
  const {
    data: balance,
    isLoading,
    isError,
  } = useDispatchBalance(lotNumber || null);
  const { data: countLabels } = useYarnCountLabels();

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
      data-ocid="dispatch.panel"
      className={`rounded-md border p-3 space-y-2 text-sm transition-colors ${panelClass}`}
    >
      {isLoading ? (
        <div
          data-ocid="dispatch.loading_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Fetching dispatch balance…</span>
        </div>
      ) : isError ? (
        <div
          data-ocid="dispatch.error_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="text-xs">
            Unable to fetch balance. Please try again.
          </span>
        </div>
      ) : balance === null || balance === undefined ? (
        <div
          data-ocid="dispatch.error_state"
          className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs">
            No packing records found for Lot <strong>{lotNumber}</strong>.
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
                Ne {countLabels?.get(lotNumber) ?? String(balance.yarnCountNe)}
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

          {/* Balance rows */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Packed
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {Number(balance.totalPackedKg)} kg
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Dispatched
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {Number(balance.totalDispatchedKg)} kg
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-foreground">
                Available
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
          </div>

          {/* Warning / OK states */}
          {isZeroBalance && (
            <div
              data-ocid="dispatch.error_state"
              className="flex items-start gap-2 pt-1 border-t border-destructive/20"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-destructive mt-0.5" />
              <p className="text-xs text-destructive">
                No available yarn balance for this lot. All packed yarn has been
                dispatched.
              </p>
            </div>
          )}
          {!isZeroBalance && isExceeding && (
            <div
              data-ocid="dispatch.error_state"
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
                Remaining after this dispatch:{" "}
                <strong>{availableKg! - enteredQty} kg</strong>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Bulk Dispatch Row ────────────────────────────────────────────────────────

interface BulkRowState {
  destination: string;
  quantityKg: string;
  remarks: string;
}

interface BulkDispatchRowProps {
  lotNumber: string;
  rowState: BulkRowState;
  destinations: { value: string; label: string }[];
  countLabels: Map<string, string> | undefined;
  onChange: (updated: Partial<BulkRowState>) => void;
  index: number;
}

function BulkDispatchRow({
  lotNumber,
  rowState,
  destinations,
  countLabels,
  onChange,
  index,
}: BulkDispatchRowProps) {
  const { data: balance, isLoading } = useDispatchBalance(lotNumber);

  const availableKg = balance ? Number(balance.availableKg) : null;
  const enteredQty = rowState.quantityKg ? Number(rowState.quantityKg) : 0;
  const isExceeding =
    availableKg !== null && enteredQty > 0 && enteredQty > availableKg;

  const countLabel =
    countLabels?.get(lotNumber) ??
    (balance ? String(balance.yarnCountNe) : "—");

  return (
    <TableRow
      data-ocid={`bulk_dispatch.item.${index + 1}`}
      className={`border-border/40 transition-colors ${
        enteredQty > 0 ? "bg-primary/5" : "hover:bg-muted/30"
      }`}
    >
      {/* Lot Number */}
      <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
        {lotNumber}
      </TableCell>

      {/* Count */}
      <TableCell className="whitespace-nowrap">
        {isLoading ? (
          <Skeleton className="h-5 w-12" />
        ) : (
          <Badge
            variant="secondary"
            className="text-xs font-mono bg-primary/10 text-primary border-primary/20"
          >
            Ne {countLabel}
          </Badge>
        )}
      </TableCell>

      {/* Unit */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {isLoading ? (
          <Skeleton className="h-4 w-20" />
        ) : balance ? (
          formatUnit(balance.spinningUnit)
        ) : (
          "—"
        )}
      </TableCell>

      {/* Available kg */}
      <TableCell className="whitespace-nowrap">
        {isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : availableKg !== null ? (
          <span
            className={`font-mono text-sm font-semibold ${
              availableKg <= 0
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {availableKg} kg
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Destination */}
      <TableCell className="min-w-[160px]">
        <Select
          value={rowState.destination || "none"}
          onValueChange={(v) =>
            onChange({ destination: v === "none" ? "" : v })
          }
        >
          <SelectTrigger
            data-ocid={`bulk_dispatch.select.${index + 1}`}
            className="h-8 text-xs"
          >
            <SelectValue placeholder="Select destination..." />
          </SelectTrigger>
          <SelectContent>
            {destinations.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Qty to Dispatch */}
      <TableCell className="min-w-[110px]">
        <div className="relative">
          <Input
            type="number"
            min="0"
            step="0.01"
            data-ocid={`bulk_dispatch.input.${index + 1}`}
            value={rowState.quantityKg}
            onChange={(e) => onChange({ quantityKg: e.target.value })}
            placeholder="Leave blank to skip"
            disabled={availableKg !== null && availableKg <= 0}
            className={`h-8 text-xs pr-7 ${
              isExceeding ? "border-amber-400 focus-visible:ring-amber-400" : ""
            }`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            kg
          </span>
        </div>
        {isExceeding && (
          <p className="text-[10px] text-amber-600 mt-0.5">
            Max {availableKg} kg
          </p>
        )}
      </TableCell>

      {/* Remarks */}
      <TableCell className="min-w-[140px]">
        <Input
          type="text"
          placeholder="Optional remarks"
          value={rowState.remarks}
          onChange={(e) => onChange({ remarks: e.target.value })}
          className="h-8 text-xs"
        />
      </TableCell>
    </TableRow>
  );
}

// ─── Default form state ───────────────────────────────────────────────────────

const defaultForm = {
  date: new Date().toISOString().substring(0, 10),
  lotNumber: "",
  destination: "",
  quantityKg: "",
  remarks: "",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function YarnDispatch() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { destinations } = useDropdownOptionsContext();

  const destinationLabelMap = Object.fromEntries(
    destinations.map((d) => [d.value, d.label]),
  );

  const { data: entries = [], isLoading } = useDispatchEntries();
  const { data: packingEntries = [] } = usePackingEntries();
  const { data: productionOrders = [] } = useProductionOrders();
  const { data: yarnOpeningStockEntries = [] } = useYarnOpeningStock();
  const { data: countLabels } = useYarnCountLabels();
  const createMutation = useCreateDispatchEntry();
  const deleteMutation = useDeleteDispatchEntry();
  const updateMutation = useUpdateDispatchEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [editItem, setEditItem] = useState<DispatchEntryType | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [nextDispatchNumber, setNextDispatchNumber] = useState<string>("");

  // Bulk dispatch state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().substring(0, 10),
  );
  const [bulkRows, setBulkRows] = useState<Record<string, BulkRowState>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterLotSearch, setFilterLotSearch] = useState("");

  const { data: balance } = useDispatchBalance(form.lotNumber || null);

  const inProgressLotNumbers = new Set(
    productionOrders
      .filter((po) => {
        const status = String(
          typeof po.status === "object" && po.status !== null
            ? Object.keys(po.status)[0]
            : po.status,
        );
        return status === "inProgress";
      })
      .map((po) => po.lotNumber),
  );

  const openingStockLotNumbers = yarnOpeningStockEntries
    .map((os) => os.lotNumber)
    .filter(Boolean);

  const lotNumbers = Array.from(
    new Set([
      ...packingEntries
        .map((pe) => pe.lotNumber)
        .filter((lot) => Boolean(lot) && inProgressLotNumbers.has(lot)),
      ...openingStockLotNumbers,
    ]),
  ).sort();

  const isLotSelected = lotNumbers.includes(form.lotNumber);

  const enteredQty = form.quantityKg ? Number(form.quantityKg) : 0;
  const availableKg = balance ? Number(balance.availableKg) : null;
  const isExceeding =
    availableKg !== null && enteredQty > 0 && enteredQty > availableKg;
  const isZeroBalance = availableKg !== null && availableKg <= 0;
  const isSubmitBlocked =
    !form.lotNumber ||
    !isLotSelected ||
    !form.destination ||
    !form.quantityKg ||
    isExceeding ||
    isZeroBalance ||
    (balance === null && form.lotNumber !== "");

  const sortedEntries = [...entries].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      if (filterDateFrom) {
        const entryDate = new Date(Number(entry.dispatchDate) / 1_000_000);
        const fromDate = new Date(filterDateFrom);
        if (entryDate < fromDate) return false;
      }
      if (filterDateTo) {
        const entryDate = new Date(Number(entry.dispatchDate) / 1_000_000);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }
      if (
        filterLotSearch &&
        !entry.lotNumber.toLowerCase().includes(filterLotSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [sortedEntries, filterDateFrom, filterDateTo, filterLotSearch]);

  const hasActiveFilters = filterDateFrom || filterDateTo || filterLotSearch;
  const LATEST_COUNT_DISPATCH = 25;
  const displayedDispatchEntries = hasActiveFilters
    ? filteredEntries
    : [...filteredEntries]
        .sort((a, b) => (a.id > b.id ? -1 : 1))
        .slice(0, LATEST_COUNT_DISPATCH);
  const isShowingLimitedDispatch =
    !hasActiveFilters && filteredEntries.length > LATEST_COUNT_DISPATCH;

  function clearDispatchFilters() {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterLotSearch("");
  }

  function generateDispatchNumber() {
    const year = new Date().getFullYear();
    const nextNum = entries.length + 1;
    return `DSP-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  function openAdd() {
    setEditItem(null);
    setNextDispatchNumber(generateDispatchNumber());
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: DispatchEntryType) {
    setEditItem(item);
    const dateStr = new Date(Number(item.dispatchDate) / 1_000_000)
      .toISOString()
      .substring(0, 10);
    setForm({
      date: dateStr,
      lotNumber: item.lotNumber,
      destination: item.destination as string,
      quantityKg: String(Number(item.quantityKg)),
      remarks: item.remarks,
    });
    setNextDispatchNumber(item.dispatchNumber);
    setDialogOpen(true);
  }

  function openBulkDispatch() {
    const initialRows: Record<string, BulkRowState> = {};
    for (const lot of lotNumbers) {
      initialRows[lot] = { destination: "", quantityKg: "", remarks: "" };
    }
    setBulkRows(initialRows);
    setBulkDate(new Date().toISOString().substring(0, 10));
    setBulkDialogOpen(true);
  }

  function updateBulkRow(lot: string, updated: Partial<BulkRowState>) {
    setBulkRows((prev) => ({
      ...prev,
      [lot]: { ...prev[lot], ...updated },
    }));
  }

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await fn();
    }
  }

  async function handleBulkSave() {
    const dispatchDateTs = BigInt(new Date(bulkDate).getTime() * 1_000_000);
    const rowsToSave = Object.entries(bulkRows).filter(
      ([, row]) => row.quantityKg !== "" && Number(row.quantityKg) > 0,
    );

    if (rowsToSave.length === 0) {
      toast.error("No quantities entered. Fill at least one row to dispatch.");
      return;
    }

    // Validate all rows before saving
    for (const [lot, row] of rowsToSave) {
      if (!row.destination) {
        toast.error(
          `Please select a destination for lot ${lot} before saving.`,
        );
        return;
      }
    }

    setBulkSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [lot, row] of rowsToSave) {
      try {
        await withRetry(() =>
          createMutation.mutateAsync({
            lotNumber: lot,
            destination: row.destination as DispatchDestination,
            quantityKg: BigInt(Math.round(Number(row.quantityKg))),
            dispatchDate: dispatchDateTs,
            remarks: row.remarks,
          }),
        );
        successCount++;
      } catch (err) {
        errorCount++;
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Lot ${lot}: ${msg || "Failed to save"}`);
      }
    }

    setBulkSaving(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} dispatch entr${successCount === 1 ? "y" : "ies"} saved successfully`,
      );
    }
    if (errorCount === 0) {
      setBulkDialogOpen(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem && isZeroBalance) {
      toast.error(
        `Not enough stock available. Available: 0 kg, Requested: ${enteredQty} kg`,
      );
      return;
    }
    if (!editItem && isExceeding && availableKg !== null) {
      toast.error(
        `Not enough stock available. Available: ${availableKg} kg, Requested: ${enteredQty} kg`,
      );
      return;
    }
    if (!editItem && isSubmitBlocked) return;
    const dispatchDateTs = BigInt(new Date(form.date).getTime() * 1_000_000);
    try {
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            dispatchDate: dispatchDateTs,
            destination: form.destination as DispatchDestination,
            quantityKg: BigInt(Math.round(Number(form.quantityKg))),
            remarks: form.remarks,
          }),
        );
        toast.success("Dispatch entry updated");
        setEditItem(null);
      } else {
        await withRetry(() =>
          createMutation.mutateAsync({
            lotNumber: form.lotNumber,
            destination: form.destination as DispatchDestination,
            quantityKg: BigInt(Math.round(Number(form.quantityKg))),
            dispatchDate: dispatchDateTs,
            remarks: form.remarks,
          }),
        );
        toast.success("Dispatch entry saved");
      }
      setDialogOpen(false);
    } catch (err) {
      console.error("Operation failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        isLoggedIn ? msg || "Operation failed" : "Please sign in to save data",
      );
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await withRetry(() => deleteMutation.mutateAsync(deleteId));
      toast.success("Dispatch entry deleted");
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

  const isPending = createMutation.isPending;

  // Count bulk rows with qty filled
  const bulkFilledCount = Object.values(bulkRows).filter(
    (r) => r.quantityKg !== "" && Number(r.quantityKg) > 0,
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yarn Dispatch"
        description="Record yarn dispatch entries by lot number — inventory deducted automatically"
        action={
          <div className="flex items-center gap-2">
            <Button
              data-ocid="dispatch.bulk_open_modal_button"
              variant="outline"
              onClick={openBulkDispatch}
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              Bulk Dispatch
            </Button>
            <Button
              data-ocid="dispatch.primary_button"
              onClick={openAdd}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Dispatch
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1">
          <Label
            htmlFor="df-date-from"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            From Date
          </Label>
          <Input
            id="df-date-from"
            type="date"
            data-ocid="dispatch.date_from.input"
            className="w-40 h-8 text-sm"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="df-date-to"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            To Date
          </Label>
          <Input
            id="df-date-to"
            type="date"
            data-ocid="dispatch.date_to.input"
            className="w-40 h-8 text-sm"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="df-lot"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            Lot Number
          </Label>
          <Input
            id="df-lot"
            type="text"
            data-ocid="dispatch.lot_search.input"
            className="w-44 h-8 text-sm"
            placeholder="Search lot..."
            value={filterLotSearch}
            onChange={(e) => setFilterLotSearch(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDispatchFilters}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground self-end pb-1.5">
            {filteredEntries.length} of {entries.length} entries
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="dispatch.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <EmptyState
            data-ocid="dispatch.empty_state"
            icon={<Truck className="w-7 h-7" />}
            title="No dispatch entries"
            description="Record yarn dispatch entries here. Stock will be automatically deducted from yarn inventory."
            actionLabel="New Dispatch"
            onAction={openAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Dispatch #
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
                    Destination
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
                {displayedDispatchEntries.map((entry, idx) => (
                  <TableRow
                    key={String(entry.id)}
                    data-ocid={`dispatch.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary">
                      {entry.dispatchNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(
                        Number(entry.dispatchDate) / 1_000_000,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {entry.lotNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      Ne{" "}
                      {countLabels?.get(entry.lotNumber) ??
                        String(entry.yarnCountNe)}
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
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium">
                          {formatDestination(
                            entry.destination,
                            destinationLabelMap,
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {Number(entry.quantityKg)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {entry.remarks || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`dispatch.edit_button.${idx + 1}`}
                            onClick={() => openEdit(entry)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`dispatch.delete_button.${idx + 1}`}
                            onClick={() => setDeleteId(entry.id)}
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
          </div>
        )}
      </div>

      {/* ── Bulk Dispatch Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(o) => {
          if (!bulkSaving) setBulkDialogOpen(o);
        }}
      >
        <DialogContent
          data-ocid="bulk_dispatch.dialog"
          className="w-[95vw] max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0"
        >
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Bulk Dispatch Entry
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enter dispatch quantities for multiple lots at once. Rows with
                  blank quantity will be skipped.
                </p>
              </div>
            </div>

            {/* Date row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="bulk-date"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Dispatch Date
                </Label>
                <Input
                  id="bulk-date"
                  type="date"
                  data-ocid="bulk_dispatch.input"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-44 h-8 text-sm"
                  disabled={bulkSaving}
                />
              </div>
              {bulkFilledCount > 0 && (
                <span className="text-xs text-primary font-medium bg-primary/10 rounded-full px-2.5 py-0.5">
                  {bulkFilledCount} lot{bulkFilledCount !== 1 ? "s" : ""} to
                  dispatch
                </span>
              )}
            </div>
          </DialogHeader>

          {/* Table */}
          <ScrollArea className="flex-1 min-h-0">
            {lotNumbers.length === 0 ? (
              <div
                data-ocid="bulk_dispatch.empty_state"
                className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"
              >
                <Truck className="w-8 h-8" />
                <p className="text-sm">
                  No active lots available for dispatch.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent sticky top-0 bg-background z-10">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Lot No.
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Count (Ne)
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Unit
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Available (kg)
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Destination
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Qty to Dispatch
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        Remarks
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotNumbers.map((lot, idx) => (
                      <BulkDispatchRow
                        key={lot}
                        lotNumber={lot}
                        rowState={
                          bulkRows[lot] ?? {
                            destination: "",
                            quantityKg: "",
                            remarks: "",
                          }
                        }
                        destinations={destinations}
                        countLabels={countLabels}
                        onChange={(updated) => updateBulkRow(lot, updated)}
                        index={idx}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/60 flex-shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {lotNumbers.length} lot{lotNumbers.length !== 1 ? "s" : ""}{" "}
              available · Each row has its own destination
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                data-ocid="bulk_dispatch.cancel_button"
                onClick={() => setBulkDialogOpen(false)}
                disabled={bulkSaving}
              >
                Cancel
              </Button>
              <Button
                data-ocid="bulk_dispatch.submit_button"
                onClick={handleBulkSave}
                disabled={bulkSaving || bulkFilledCount === 0}
                className="gap-2"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Save{bulkFilledCount > 0 ? ` ${bulkFilledCount}` : ""}{" "}
                    Dispatch{bulkFilledCount !== 1 ? "es" : ""}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New / Edit Dispatch Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setEditItem(null);
          setDialogOpen(o);
        }}
      >
        <DialogContent
          data-ocid="dispatch.dialog"
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Dispatch Entry" : "New Dispatch Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Dispatch Number (auto-generated) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Dispatch Number (Auto-generated)
              </Label>
              <div className="flex items-center h-9 px-3 rounded-md border border-border/60 bg-muted/40">
                <span className="text-sm font-mono font-medium text-primary">
                  {nextDispatchNumber ?? "Loading…"}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="dp-date">Dispatch Date</Label>
              <Input
                id="dp-date"
                type="date"
                data-ocid="dispatch.input"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                required
              />
            </div>

            {/* Lot Number — combobox search */}
            <div className="space-y-1.5">
              <Label htmlFor="dp-lot">Lot Number</Label>
              <LotCombobox
                value={form.lotNumber}
                options={lotNumbers}
                onChange={(lot) =>
                  setForm((p) => ({ ...p, lotNumber: lot, quantityKg: "" }))
                }
              />
            </div>

            {/* Balance Panel */}
            {isLotSelected && (
              <DispatchBalancePanel
                lotNumber={form.lotNumber}
                enteredQty={enteredQty}
              />
            )}

            {/* Destination */}
            <div className="space-y-1.5">
              <Label htmlFor="dp-dest">Destination</Label>
              <Select
                value={form.destination || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    destination: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="dp-dest" data-ocid="dispatch.select">
                  <SelectValue placeholder="Select destination..." />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="dp-qty">Quantity (kg)</Label>
              <Input
                id="dp-qty"
                type="number"
                min="1"
                data-ocid="dispatch.input"
                value={form.quantityKg}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantityKg: e.target.value }))
                }
                placeholder="e.g. 500"
                disabled={!isLotSelected || isZeroBalance}
                required
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="dp-remarks">Remarks (optional)</Label>
              <Textarea
                id="dp-remarks"
                data-ocid="dispatch.textarea"
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                placeholder="Any notes about this dispatch..."
                rows={2}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="dispatch.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="dispatch.submit_button"
                disabled={
                  editItem
                    ? updateMutation.isPending
                    : isPending || isSubmitBlocked
                }
              >
                {(isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editItem ? "Update" : "Save Dispatch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isShowingLimitedDispatch && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Showing 25 most recent. Use filters to find older entries.
        </p>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Dispatch Entry"
        description="This will permanently delete this dispatch entry and restore the yarn balance."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
