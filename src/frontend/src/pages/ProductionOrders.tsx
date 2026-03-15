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
import { ClipboardList, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateProductionOrder,
  useDeleteProductionOrder,
  useProductionOrders,
  useSetYarnCountLabel,
  useUpdateProductionOrder,
} from "../hooks/useQueries";
import type {
  EndUse,
  OrderStatus,
  ProductType,
  ProductionOrder,
  SpinningUnit,
  TwistDirection,
} from "../types";

const defaultForm = {
  orderNumber: "",
  lotNumber: "",
  singleYarnLotNumber: "",
  productType: "carded" as ProductType,
  spinningUnit: "openend" as SpinningUnit,
  endUse: "warp" as EndUse,
  yarnCountNe: "",
  twistDirection: "z" as TwistDirection,
  quantityKg: "",
  targetDate: "",
  status: "pending" as OrderStatus,
};

export default function ProductionOrders() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { productTypes, endUses } = useDropdownOptionsContext();
  const { data: orders = [], isLoading } = useProductionOrders();
  const createMutation = useCreateProductionOrder();
  const updateMutation = useUpdateProductionOrder();
  const setYarnCountLabelMutation = useSetYarnCountLabel();
  const deleteMutation = useDeleteProductionOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductionOrder | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lotSearch, setLotSearch] = useState<string>("");

  function generateOrderNumber() {
    const year = new Date().getFullYear();
    const nextNum = orders.length + 1;
    return `PO-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  function openAdd() {
    setEditItem(null);
    setForm({ ...defaultForm, orderNumber: generateOrderNumber() });
    setDialogOpen(true);
  }

  function openEdit(item: ProductionOrder) {
    setEditItem(item);
    const d = new Date(Number(item.targetDate) / 1_000_000);
    setForm({
      orderNumber: item.orderNumber,
      lotNumber: item.lotNumber,
      singleYarnLotNumber: item.singleYarnLotNumber ?? "",
      productType: item.productType,
      spinningUnit: item.spinningUnit,
      endUse: item.endUse,
      yarnCountNe: String(item.yarnCountNe),
      twistDirection: item.twistDirection,
      quantityKg: String(Number(item.quantityKg)),
      targetDate: d.toISOString().substring(0, 10),
      status: item.status,
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
    const targetTs = BigInt(new Date(form.targetDate).getTime() * 1_000_000);
    try {
      const rawCountStr = form.yarnCountNe;
      const parsedCount = BigInt(
        Math.round(Number.parseFloat(rawCountStr) || 0),
      );
      const showSingleYarnLot =
        form.spinningUnit === "tfo" || form.spinningUnit === "outsideYarn";
      const singleYarnLotNumber =
        showSingleYarnLot && form.singleYarnLotNumber
          ? form.singleYarnLotNumber
          : null;
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            orderNumber: form.orderNumber,
            lotNumber: form.lotNumber,
            singleYarnLotNumber,
            productType: form.productType,
            spinningUnit: form.spinningUnit,
            endUse: form.endUse,
            yarnCountNe: parsedCount,
            twistDirection: form.twistDirection,
            quantityKg: BigInt(Math.round(Number(form.quantityKg))),
            targetDate: targetTs,
            status: form.status,
          }),
        );
        toast.success("Order updated");
      } else {
        await withRetry(() =>
          createMutation.mutateAsync({
            orderNumber: form.orderNumber,
            lotNumber: form.lotNumber,
            singleYarnLotNumber,
            productType: form.productType,
            spinningUnit: form.spinningUnit,
            endUse: form.endUse,
            yarnCountNe: parsedCount,
            twistDirection: form.twistDirection,
            quantityKg: BigInt(Math.round(Number(form.quantityKg))),
            targetDate: targetTs,
            status: "pending" as OrderStatus,
          }),
        );
        toast.success("Order created");
      }
      // Save count label for display
      try {
        await setYarnCountLabelMutation.mutateAsync({
          lotNumber: form.lotNumber,
          countLabel: rawCountStr,
        });
      } catch {}
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
      toast.success("Order deleted");
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredOrders = orders
    .filter((o) => filterStatus === "all" || o.status === filterStatus)
    .filter(
      (o) =>
        !lotSearch.trim() ||
        o.lotNumber.toLowerCase().includes(lotSearch.trim().toLowerCase()),
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Production Orders"
        description="Manage yarn production orders and track their progress"
        action={
          <Button
            data-ocid="orders.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        }
      />

      {/* Status Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className="w-48"
            data-ocid="orders.status_filter_select"
          >
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inProgress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label className="text-xs">Lot Number</Label>
          <Input
            placeholder="Search lot..."
            data-ocid="orders.lot_search_input"
            value={lotSearch}
            onChange={(e) => setLotSearch(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        {(filterStatus !== "all" || lotSearch) && (
          <Button
            variant="ghost"
            size="sm"
            data-ocid="orders.clear_filter_button"
            onClick={() => {
              setFilterStatus("all");
              setLotSearch("");
            }}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filter
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
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            data-ocid="orders.empty_state"
            icon={<ClipboardList className="w-7 h-7" />}
            title={
              filterStatus !== "all"
                ? "No orders match this status"
                : "No production orders"
            }
            description={
              filterStatus !== "all"
                ? "Try selecting a different status filter."
                : "Create your first production order to begin tracking yarn manufacturing."
            }
            actionLabel={filterStatus !== "all" ? undefined : "Create Order"}
            onAction={filterStatus !== "all" ? undefined : openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Order #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Single Yarn Lot
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Product Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Unit
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  End Use
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Yarn Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Target Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order, idx) => (
                <TableRow
                  key={String(order.id)}
                  data-ocid={`orders.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono-nums font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="font-mono-nums text-sm">
                    {order.lotNumber || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono-nums text-sm">
                    {order.singleYarnLotNumber || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {order.productType === "lt"
                      ? "LT"
                      : order.productType.charAt(0).toUpperCase() +
                        order.productType.slice(1)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.spinningUnit === "openend"
                      ? "OE Spinning"
                      : order.spinningUnit === "ringSpinning"
                        ? "Ring Spinning"
                        : order.spinningUnit === "tfo"
                          ? "TFO"
                          : order.spinningUnit === "outsideYarn"
                            ? "Outside Yarn"
                            : order.spinningUnit}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.endUse === "tfo"
                      ? "TFO"
                      : order.endUse.charAt(0).toUpperCase() +
                        order.endUse.slice(1)}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {order.yarnCountNe}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {order.twistDirection === "s" ? "OE" : "RS"}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(order.quantityKg).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(
                      Number(order.targetDate) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`orders.edit_button.${idx + 1}`}
                          onClick={() => openEdit(order)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`orders.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(order.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="orders.dialog" className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Production Order" : "New Production Order"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-num">Order Number</Label>
                <Input
                  id="ord-num"
                  data-ocid="orders.input"
                  value={form.orderNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, orderNumber: e.target.value }))
                  }
                  placeholder="PO-2026-001"
                  readOnly={!editItem}
                  className={!editItem ? "bg-muted/50 cursor-default" : ""}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-lot">Lot Number</Label>
                <Input
                  id="ord-lot"
                  data-ocid="orders.lot_number_input"
                  value={form.lotNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lotNumber: e.target.value }))
                  }
                  placeholder="LOT-2026-001"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-type">Product Type</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, productType: v as ProductType }))
                  }
                >
                  <SelectTrigger id="ord-type" data-ocid="orders.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-unit">Unit</Label>
                <Select
                  value={form.spinningUnit}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, spinningUnit: v as SpinningUnit }))
                  }
                >
                  <SelectTrigger id="ord-unit" data-ocid="orders.unit_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openend">OE Spinning</SelectItem>
                    <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
                    <SelectItem value="tfo">TFO</SelectItem>
                    <SelectItem value="outsideYarn">Outside Yarn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-enduse">End Use</Label>
                <Select
                  value={form.endUse}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, endUse: v as EndUse }))
                  }
                >
                  <SelectTrigger
                    id="ord-enduse"
                    data-ocid="orders.enduse_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {endUses.map((eu) => (
                      <SelectItem key={eu.value} value={eu.value}>
                        {eu.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.spinningUnit === "tfo" ||
              form.spinningUnit === "outsideYarn") && (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ord-single-yarn-lot">
                    Single Yarn Lot Number
                  </Label>
                  <Input
                    id="ord-single-yarn-lot"
                    data-ocid="orders.single_yarn_lot_input"
                    value={form.singleYarnLotNumber}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        singleYarnLotNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. LOT-2026-001"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-ne">Yarn Count (Ne)</Label>
                <Input
                  id="ord-ne"
                  type="text"
                  value={form.yarnCountNe}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yarnCountNe: e.target.value }))
                  }
                  placeholder="e.g. 30/1 or 40@"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-twist">Type</Label>
                <Select
                  value={form.twistDirection}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      twistDirection: v as TwistDirection,
                    }))
                  }
                >
                  <SelectTrigger id="ord-twist">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s">OE</SelectItem>
                    <SelectItem value="z">RS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-qty">Quantity (kg)</Label>
                <Input
                  id="ord-qty"
                  type="number"
                  min="0"
                  value={form.quantityKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantityKg: e.target.value }))
                  }
                  placeholder="1000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-date">Target Date</Label>
                <Input
                  id="ord-date"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            {editItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ord-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, status: v as OrderStatus }))
                    }
                  >
                    <SelectTrigger id="ord-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inProgress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="orders.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="orders.submit_button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Production Order"
        description="This will permanently delete this production order. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
