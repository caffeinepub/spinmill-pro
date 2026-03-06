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
import { Loader2, PackageOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { InwardEntry as InwardEntryType, Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddInwardEntry,
  useDeleteInwardEntry,
  useInwardEntries,
  useNextInwardNumber,
  usePOBalance,
  usePurchaseOrders,
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

// ─── Warehouse Badge ──────────────────────────────────────────────────────────

function WarehouseBadge({ warehouse }: { warehouse: Warehouse | string }) {
  const isOE = (warehouse as string) === "oeRawMaterial";
  return (
    <Badge
      variant="outline"
      className={
        isOE
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 text-xs"
          : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60 text-xs"
      }
    >
      {warehouseLabel(warehouse)}
    </Badge>
  );
}

// ─── Default Form ─────────────────────────────────────────────────────────────

const defaultForm = {
  inwardNumber: "",
  purchaseOrderId: "",
  inwardDate: todayStr(),
  materialName: "",
  receivedQty: "",
  warehouse: "" as Warehouse | "",
  vehicleNumber: "",
  remarks: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InwardEntry() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { materialNames } = useDropdownOptionsContext();

  const { data: entries = [], isLoading: entriesLoading } = useInwardEntries();
  const { data: purchaseOrders = [], isLoading: poLoading } =
    usePurchaseOrders();
  const addMutation = useAddInwardEntry();
  const deleteMutation = useDeleteInwardEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  const isLoading = entriesLoading || poLoading;

  // Build a map from PO id -> PO for quick lookups
  const poMap = new Map(purchaseOrders.map((po) => [String(po.id), po]));

  // Fetch next inward number whenever dialog is open
  const { data: nextInwardData } = useNextInwardNumber(dialogOpen);

  // Pre-fill inward number when it arrives
  useEffect(() => {
    if (nextInwardData && dialogOpen) {
      setForm((p) => ({ ...p, inwardNumber: nextInwardData }));
    }
  }, [nextInwardData, dialogOpen]);

  // Fetch PO balance when a PO is selected
  const selectedPoId = form.purchaseOrderId
    ? BigInt(form.purchaseOrderId)
    : null;
  const { data: poBalanceData } = usePOBalance(selectedPoId);
  const poBalance = poBalanceData ?? null;

  // Auto-fill material name when PO is selected
  useEffect(() => {
    if (form.purchaseOrderId) {
      const po = purchaseOrders.find(
        (p) => String(p.id) === form.purchaseOrderId,
      );
      if (po) {
        setForm((prev) => ({ ...prev, materialName: po.materialName }));
      }
    }
  }, [form.purchaseOrderId, purchaseOrders]);

  function openAdd() {
    setForm(defaultForm);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.warehouse) {
      toast.error("Please select a warehouse");
      return;
    }
    if (!form.purchaseOrderId) {
      toast.error("Please select a purchase order");
      return;
    }
    // Validate quantity against PO balance
    if (poBalance && Number(form.receivedQty) > Number(poBalance.balanceQty)) {
      toast.error(
        `Cannot exceed balance qty (${Number(poBalance.balanceQty)} kg)`,
      );
      return;
    }
    try {
      await addMutation.mutateAsync({
        inwardNumber: form.inwardNumber,
        purchaseOrderId: BigInt(form.purchaseOrderId),
        inwardDate: dateStringToNs(form.inwardDate),
        materialName: form.materialName,
        receivedQty: BigInt(Math.round(Number(form.receivedQty))),
        warehouse: form.warehouse as Warehouse,
        vehicleNumber: form.vehicleNumber,
        remarks: form.remarks,
      });
      toast.success("Inward entry recorded");
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
      toast.success("Inward entry deleted");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  function getPODisplay(entry: InwardEntryType): string {
    const po = poMap.get(String(entry.purchaseOrderId));
    return po ? po.poNumber : `#${String(entry.purchaseOrderId)}`;
  }

  function getSupplier(entry: InwardEntryType): string {
    const po = poMap.get(String(entry.purchaseOrderId));
    return po ? po.supplier : "—";
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Inward Entry"
        description="Record raw material receipts against purchase orders"
        action={
          <Button
            data-ocid="inward.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Inward Entry
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
            data-ocid="inward.empty_state"
            icon={<PackageOpen className="w-7 h-7" />}
            title="No inward entries yet"
            description="Record your first raw material receipt against a purchase order."
            actionLabel="New Inward Entry"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Inward No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  PO Number
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Material
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Received Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Warehouse
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Vehicle No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Inward Date
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
                  data-ocid={`inward.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary">
                    {entry.inwardNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {getPODisplay(entry)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getSupplier(entry)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.materialName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {Number(entry.receivedQty).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <WarehouseBadge warehouse={entry.warehouse} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.vehicleNumber || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.inwardDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`inward.delete_button.${idx + 1}`}
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

      {/* Add Inward Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="inward.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Inward Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="iw-number">Inward Number</Label>
                  <span className="text-xs text-muted-foreground italic">
                    (auto-generated)
                  </span>
                </div>
                <Input
                  id="iw-number"
                  data-ocid="inward.input"
                  value={form.inwardNumber}
                  readOnly
                  placeholder="Generating…"
                  className="bg-muted/60 text-muted-foreground cursor-default select-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iw-date">Inward Date</Label>
                <Input
                  id="iw-date"
                  type="date"
                  data-ocid="inward.input"
                  value={form.inwardDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, inwardDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iw-po">Purchase Order</Label>
              <Select
                value={form.purchaseOrderId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, purchaseOrderId: v }))
                }
              >
                <SelectTrigger id="iw-po" data-ocid="inward.select">
                  <SelectValue placeholder="Select purchase order..." />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No purchase orders available
                    </div>
                  ) : (
                    purchaseOrders.map((po) => (
                      <SelectItem key={String(po.id)} value={String(po.id)}>
                        {po.poNumber} – {po.supplier} – {po.materialName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {/* PO Balance info row */}
              {form.purchaseOrderId && poBalance && (
                <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50 border border-border/50 text-sm">
                  <span className="text-muted-foreground">
                    Ordered:{" "}
                    <span className="font-semibold text-foreground">
                      {Number(poBalance.orderedQty).toLocaleString()} kg
                    </span>
                  </span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-muted-foreground">
                    Received:{" "}
                    <span className="font-semibold text-foreground">
                      {Number(poBalance.receivedQty).toLocaleString()} kg
                    </span>
                  </span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-muted-foreground">
                    Balance:{" "}
                    <span
                      className={`font-bold ${
                        Number(poBalance.balanceQty) > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-destructive"
                      }`}
                    >
                      {Number(poBalance.balanceQty).toLocaleString()} kg
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iw-material">Material Name</Label>
              <Select
                value={form.materialName}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, materialName: v }))
                }
              >
                <SelectTrigger id="iw-material" data-ocid="inward.select">
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
                <Label htmlFor="iw-qty">Received Qty (kg)</Label>
                <Input
                  id="iw-qty"
                  type="number"
                  min="1"
                  step="1"
                  max={poBalance ? Number(poBalance.balanceQty) : undefined}
                  data-ocid="inward.input"
                  value={form.receivedQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, receivedQty: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iw-warehouse">Warehouse</Label>
                <Select
                  value={form.warehouse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, warehouse: v as Warehouse }))
                  }
                >
                  <SelectTrigger id="iw-warehouse" data-ocid="inward.select">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iw-vehicle">Vehicle Number</Label>
              <Input
                id="iw-vehicle"
                data-ocid="inward.input"
                value={form.vehicleNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, vehicleNumber: e.target.value }))
                }
                placeholder="TN-01-AB-1234"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="iw-remarks">Remarks</Label>
              <Textarea
                id="iw-remarks"
                data-ocid="inward.textarea"
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                placeholder="Optional remarks or notes..."
                className="resize-none h-20"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="inward.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="inward.submit_button"
                disabled={addMutation.isPending}
              >
                {addMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Record Inward
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Inward Entry"
        description="This will permanently delete this inward entry. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
