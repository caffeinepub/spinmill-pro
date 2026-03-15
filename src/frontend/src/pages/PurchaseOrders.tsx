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
import { Loader2, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreatePurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useUpdatePurchaseOrder,
} from "../hooks/useQueries";
import type { PurchaseOrder, PurchaseOrderStatus } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bigintToDateString(ns: bigint): string {
  const d = new Date(Number(ns) / 1_000_000);
  return d.toISOString().substring(0, 10);
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function POStatusBadge({ status }: { status: PurchaseOrderStatus | string }) {
  const config: Record<string, { label: string; cls: string }> = {
    open: {
      label: "Open",
      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
    },
    partiallyReceived: {
      label: "Partially Received",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
    },
    closed: {
      label: "Closed",
      cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/60",
    },
  };

  const c = config[status as string] ?? {
    label: String(status),
    cls: "",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${c.cls}`}>
      {c.label}
    </Badge>
  );
}

// ─── Default Form ─────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function nextMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().substring(0, 10);
}

const defaultForm = {
  poNumber: "",
  supplier: "",
  materialName: "",
  orderedQty: "",
  orderDate: todayStr(),
  expectedDeliveryDate: nextMonthStr(),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { materialNames } = useDropdownOptionsContext();

  const { data: orders = [], isLoading } = usePurchaseOrders();
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PurchaseOrder | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function generatePONumber() {
    const year = new Date().getFullYear();
    const nextNum = orders.length + 1;
    return `PO-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  function openAdd() {
    setEditItem(null);
    setForm({ ...defaultForm, poNumber: generatePONumber() });
    setDialogOpen(true);
  }

  function openEdit(item: PurchaseOrder) {
    setEditItem(item);
    setForm({
      poNumber: item.poNumber,
      supplier: item.supplier,
      materialName: item.materialName,
      orderedQty: String(Number(item.orderedQty)),
      orderDate: bigintToDateString(item.orderDate),
      expectedDeliveryDate: bigintToDateString(item.expectedDeliveryDate),
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
    try {
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            poNumber: form.poNumber,
            supplier: form.supplier,
            materialName: form.materialName,
            orderedQty: BigInt(Math.round(Number(form.orderedQty))),
            orderDate: dateStringToNs(form.orderDate),
            expectedDeliveryDate: dateStringToNs(form.expectedDeliveryDate),
          }),
        );
        toast.success("Purchase order updated");
      } else {
        await withRetry(() =>
          createMutation.mutateAsync({
            poNumber: form.poNumber,
            supplier: form.supplier,
            materialName: form.materialName,
            orderedQty: BigInt(Math.round(Number(form.orderedQty))),
            orderDate: dateStringToNs(form.orderDate),
            expectedDeliveryDate: dateStringToNs(form.expectedDeliveryDate),
          }),
        );
        toast.success("Purchase order created");
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
      toast.success("Purchase order deleted");
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Purchase Orders"
        description="Manage raw material purchase orders from suppliers"
        action={
          <Button
            data-ocid="purchaseorders.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Purchase Order
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
        ) : orders.length === 0 ? (
          <EmptyState
            data-ocid="purchaseorders.empty_state"
            icon={<ShoppingCart className="w-7 h-7" />}
            title="No purchase orders yet"
            description="Create your first purchase order to track raw material procurement."
            actionLabel="New Purchase Order"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
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
                  Ordered Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Order Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Expected Delivery
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
              {orders.map((order, idx) => (
                <TableRow
                  key={String(order.id)}
                  data-ocid={`purchaseorders.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-sm font-semibold text-primary">
                    {order.poNumber}
                  </TableCell>
                  <TableCell className="text-sm">{order.supplier}</TableCell>
                  <TableCell className="text-sm">
                    {order.materialName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(order.orderedQty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.expectedDeliveryDate)}
                  </TableCell>
                  <TableCell>
                    <POStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`purchaseorders.edit_button.${idx + 1}`}
                          onClick={() => openEdit(order)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`purchaseorders.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(order.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="purchaseorders.dialog"
          className="sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Purchase Order" : "New Purchase Order"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="po-number">PO Number</Label>
                  {!editItem && (
                    <span className="text-xs text-muted-foreground italic">
                      (auto-generated)
                    </span>
                  )}
                </div>
                <Input
                  id="po-number"
                  data-ocid="purchaseorders.input"
                  value={form.poNumber}
                  onChange={(e) =>
                    editItem
                      ? setForm((p) => ({ ...p, poNumber: e.target.value }))
                      : undefined
                  }
                  readOnly={!editItem}
                  placeholder={!editItem ? "Generating…" : "PO-2024-001"}
                  className={
                    !editItem
                      ? "bg-muted/60 text-muted-foreground cursor-default select-none"
                      : ""
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-supplier">Supplier</Label>
                <Input
                  id="po-supplier"
                  data-ocid="purchaseorders.input"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, supplier: e.target.value }))
                  }
                  placeholder="Supplier name"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-material">Material Name</Label>
              <Select
                value={form.materialName}
                onValueChange={(val) =>
                  setForm((p) => ({ ...p, materialName: val }))
                }
                required
              >
                <SelectTrigger
                  id="po-material"
                  data-ocid="purchaseorders.select"
                >
                  <SelectValue placeholder="Select material" />
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
              <Label htmlFor="po-qty">Ordered Quantity (kg)</Label>
              <Input
                id="po-qty"
                type="number"
                min="1"
                step="1"
                data-ocid="purchaseorders.input"
                value={form.orderedQty}
                onChange={(e) =>
                  setForm((p) => ({ ...p, orderedQty: e.target.value }))
                }
                placeholder="1000"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="po-orderdate">Order Date</Label>
                <Input
                  id="po-orderdate"
                  type="date"
                  data-ocid="purchaseorders.input"
                  value={form.orderDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, orderDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-delivery">Expected Delivery</Label>
                <Input
                  id="po-delivery"
                  type="date"
                  data-ocid="purchaseorders.input"
                  value={form.expectedDeliveryDate}
                  min={form.orderDate}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      expectedDeliveryDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="purchaseorders.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="purchaseorders.submit_button"
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
        title="Delete Purchase Order"
        description="This will permanently delete this purchase order. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
