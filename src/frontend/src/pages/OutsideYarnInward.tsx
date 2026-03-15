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
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useUserRole } from "../hooks/UserRoleContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddYarnOpeningStock,
  useDeleteYarnOpeningStock,
  useSetYarnCountLabel,
  useUpdateYarnOpeningStock,
  useYarnCountLabels,
  useYarnOpeningStock,
} from "../hooks/useQueries";
import { SpinningUnit } from "../types";
import type { EndUse, ProductType, YarnOpeningStockRecord } from "../types";

function formatProductType(pt: string): string {
  if (pt === "lt") return "LT";
  return pt.charAt(0).toUpperCase() + pt.slice(1);
}

function formatEndUse(eu: string): string {
  if (eu === "tfo") return "TFO";
  return eu.charAt(0).toUpperCase() + eu.slice(1);
}

function formatDate(createdAt: bigint): string {
  const ms = Number(createdAt) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const defaultForm = {
  inwardNumber: "",
  inwardDate: new Date().toISOString().slice(0, 10),
  supplierName: "",
  lotNumber: "",
  yarnCountNe: "",
  productType: "" as ProductType | "",
  endUse: "" as EndUse | "",
  weightKg: "",
  vehicleNumber: "",
  remarks: "",
};

function generateInwardNumber(): string {
  return `OYI-${Date.now().toString().slice(-6)}`;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await fn();
  }
}

export default function OutsideYarnInward() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { actor, isFetching: actorLoading } = useActor();

  const { data: allEntries = [], isLoading } = useYarnOpeningStock() as {
    data: YarnOpeningStockRecord[];
    isLoading: boolean;
  };

  // Filter only outside yarn entries
  const entries = allEntries.filter(
    (e) => String(e.spinningUnit) === "outsideYarn",
  );

  const addMutation = useAddYarnOpeningStock();
  const setYarnCountLabelMutation = useSetYarnCountLabel();
  const { data: countLabels } = useYarnCountLabels();
  const deleteMutation = useDeleteYarnOpeningStock();
  const updateMutation = useUpdateYarnOpeningStock();

  const addMutationRef = useRef<ReturnType<typeof useAddYarnOpeningStock>>(
    null!,
  );
  const setYarnCountLabelMutationRef = useRef<
    ReturnType<typeof useSetYarnCountLabel>
  >(null!);
  addMutationRef.current = addMutation;
  setYarnCountLabelMutationRef.current = setYarnCountLabelMutation;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [editItem, setEditItem] = useState<YarnOpeningStockRecord | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function openAdd() {
    setEditItem(null);
    const ts = Date.now();
    setForm({
      ...defaultForm,
      inwardDate: new Date().toISOString().slice(0, 10),
      inwardNumber: generateInwardNumber(),
      lotNumber: `OY-${ts.toString().slice(-8)}`,
    });
    setDialogOpen(true);
  }

  function openEdit(item: YarnOpeningStockRecord) {
    setEditItem(item);
    const countLabel =
      countLabels?.get(item.lotNumber) ?? String(item.yarnCountNe);
    setForm({
      inwardNumber: `OYI-${String(item.id)}`,
      inwardDate: new Date(Number(item.createdAt) / 1_000_000)
        .toISOString()
        .slice(0, 10),
      supplierName: "",
      lotNumber: item.lotNumber,
      yarnCountNe: countLabel,
      productType: item.productType as ProductType,
      endUse: item.endUse as EndUse,
      weightKg: String(Number(item.weightKg)),
      vehicleNumber: "",
      remarks: "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("Please sign in to save data");
      return;
    }
    if (!actor && actorLoading && !editItem) {
      toast.error("Please wait, connecting to the network...");
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
      const rawCountStr = form.yarnCountNe;
      const parsedCount = BigInt(
        Math.round(Number.parseFloat(rawCountStr) || 0),
      );
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            lotNumber: form.lotNumber,
            yarnCountNe: parsedCount,
            spinningUnit: SpinningUnit.outsideYarn,
            productType: form.productType as ProductType,
            endUse: form.endUse as EndUse,
            weightKg: BigInt(Math.round(Number(form.weightKg))),
          }),
        );
        try {
          await setYarnCountLabelMutationRef.current.mutateAsync({
            lotNumber: form.lotNumber,
            countLabel: rawCountStr,
          });
        } catch {}
        toast.success("Outside yarn inward entry updated");
        setEditItem(null);
      } else {
        await withRetry(() =>
          addMutationRef.current.mutateAsync({
            lotNumber: form.lotNumber,
            yarnCountNe: parsedCount,
            spinningUnit: SpinningUnit.outsideYarn,
            productType: form.productType as ProductType,
            endUse: form.endUse as EndUse,
            weightKg: BigInt(Math.round(Number(form.weightKg))),
          }),
        );
        try {
          await setYarnCountLabelMutationRef.current.mutateAsync({
            lotNumber: form.lotNumber,
            countLabel: rawCountStr,
          });
        } catch {}
        toast.success("Outside yarn inward entry saved");
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
      toast.success("Outside yarn inward entry deleted");
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

  // Apply filters
  const filteredEntries = entries.filter((entry) => {
    if (
      lotSearch &&
      !entry.lotNumber.toLowerCase().includes(lotSearch.toLowerCase())
    ) {
      return false;
    }
    const entryMs = Number(entry.createdAt) / 1_000_000;
    const entryDate = new Date(entryMs);
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (entryDate < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (entryDate > to) return false;
    }
    return true;
  });

  const hasFilters = !!lotSearch || !!fromDate || !!toDate;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Outside Yarn Inward"
        description="Record inward of outside yarn directly to inventory without a Purchase Order"
        action={
          <Button
            data-ocid="outside-yarn-inward.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Inward Entry
          </Button>
        }
      />

      <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 flex items-start gap-2">
        <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Note:</strong> Outside Yarn Inward entries are added directly
          to Yarn Inventory without a Purchase Order.
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Search Lot #</Label>
          <Input
            type="text"
            placeholder="Search lot number..."
            value={lotSearch}
            onChange={(e) => setLotSearch(e.target.value)}
            className="h-8 text-sm w-48"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setLotSearch("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            data-ocid="outside-yarn-inward.empty_state"
            icon={<Truck className="w-7 h-7" />}
            title="No outside yarn inward entries yet"
            description="Record inward of outside yarn without a Purchase Order."
            actionLabel="New Inward Entry"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Inward #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot Number
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Product Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  End Use
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Unit
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry, idx) => (
                <TableRow
                  key={String(entry.id)}
                  data-ocid={`outside-yarn-inward.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono font-medium text-sm">
                    OYI-{idx + 1}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {countLabels?.get(entry.lotNumber) ??
                      String(entry.yarnCountNe)}
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
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                    >
                      Outside Yarn
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`outside-yarn-inward.edit_button.${idx + 1}`}
                          onClick={() => openEdit(entry)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`outside-yarn-inward.delete_button.${idx + 1}`}
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
        )}
      </div>

      {/* Add Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) setEditItem(null);
          setDialogOpen(o);
        }}
      >
        <DialogContent
          data-ocid="outside-yarn-inward.dialog"
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? "Edit Outside Yarn Inward Entry"
                : "New Outside Yarn Inward Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Inward Number + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oyi-number">Inward Number</Label>
                <Input
                  id="oyi-number"
                  value={form.inwardNumber}
                  readOnly
                  className="bg-muted/50 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oyi-date">Inward Date</Label>
                <Input
                  id="oyi-date"
                  type="date"
                  data-ocid="outside-yarn-inward.input"
                  value={form.inwardDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, inwardDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Row 2: Supplier + Vehicle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oyi-supplier">Supplier Name</Label>
                <Input
                  id="oyi-supplier"
                  data-ocid="outside-yarn-inward.input"
                  value={form.supplierName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, supplierName: e.target.value }))
                  }
                  placeholder="e.g. Ramesh Traders"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oyi-vehicle">Vehicle Number</Label>
                <Input
                  id="oyi-vehicle"
                  data-ocid="outside-yarn-inward.input"
                  value={form.vehicleNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vehicleNumber: e.target.value }))
                  }
                  placeholder="e.g. MH-12-AB-1234"
                />
              </div>
            </div>

            {/* Row 3: Lot Number + Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oyi-lot">Lot Number</Label>
                <Input
                  id="oyi-lot"
                  data-ocid="outside-yarn-inward.input"
                  value={form.lotNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lotNumber: e.target.value }))
                  }
                  placeholder="e.g. OY-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oyi-count">Count (Ne)</Label>
                <Input
                  id="oyi-count"
                  type="text"
                  data-ocid="outside-yarn-inward.input"
                  value={form.yarnCountNe}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yarnCountNe: e.target.value }))
                  }
                  placeholder="e.g. 30/1 or 40@"
                  required
                />
              </div>
            </div>

            {/* Row 4: Product Type + End Use */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oyi-product-type">Product Type</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, productType: v as ProductType }))
                  }
                >
                  <SelectTrigger
                    id="oyi-product-type"
                    data-ocid="outside-yarn-inward.select"
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
                <Label htmlFor="oyi-end-use">End Use</Label>
                <Select
                  value={form.endUse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, endUse: v as EndUse }))
                  }
                >
                  <SelectTrigger
                    id="oyi-end-use"
                    data-ocid="outside-yarn-inward.select"
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

            {/* Row 5: Quantity + Remarks */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oyi-qty">Quantity (kg)</Label>
                <Input
                  id="oyi-qty"
                  type="number"
                  min="1"
                  step="1"
                  data-ocid="outside-yarn-inward.input"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oyi-remarks">Remarks</Label>
                <Input
                  id="oyi-remarks"
                  data-ocid="outside-yarn-inward.input"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  placeholder="Optional remarks"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2">
              {actorLoading && !actor && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-auto">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting to network...
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                data-ocid="outside-yarn-inward.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="outside-yarn-inward.submit_button"
                disabled={
                  addMutation.isPending ||
                  updateMutation.isPending ||
                  (!actor && actorLoading && !editItem)
                }
              >
                {(addMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editItem ? "Update" : "Save Inward Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Outside Yarn Inward Entry"
        description="This will permanently delete this inward entry and remove it from Yarn Inventory. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
