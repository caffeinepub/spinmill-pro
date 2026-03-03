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
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  OrderStatus,
  ProductType,
  ProductionOrder,
  TwistDirection,
} from "../backend.d";
import {
  OrderStatus as OS,
  ProductType as PT,
  TwistDirection as TD,
} from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  useCreateProductionOrder,
  useDeleteProductionOrder,
  useProductionOrders,
  useUpdateProductionOrder,
} from "../hooks/useQueries";

const defaultForm = {
  orderNumber: "",
  productType: PT.carded as ProductType,
  yarnCountNe: "",
  twistDirection: TD.z as TwistDirection,
  quantityKg: "",
  targetDate: "",
  status: OS.pending as OrderStatus,
};

export default function ProductionOrders() {
  const { data: orders = [], isLoading } = useProductionOrders();
  const createMutation = useCreateProductionOrder();
  const updateMutation = useUpdateProductionOrder();
  const deleteMutation = useDeleteProductionOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductionOrder | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: ProductionOrder) {
    setEditItem(item);
    const d = new Date(Number(item.targetDate) / 1_000_000);
    setForm({
      orderNumber: item.orderNumber,
      productType: item.productType,
      yarnCountNe: String(Number(item.yarnCountNe)),
      twistDirection: item.twistDirection,
      quantityKg: String(Number(item.quantityKg)),
      targetDate: d.toISOString().substring(0, 10),
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetTs = BigInt(new Date(form.targetDate).getTime() * 1_000_000);
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          orderNumber: form.orderNumber,
          productType: form.productType,
          yarnCountNe: BigInt(Math.round(Number(form.yarnCountNe))),
          twistDirection: form.twistDirection,
          quantityKg: BigInt(Math.round(Number(form.quantityKg))),
          targetDate: targetTs,
          status: form.status,
        });
        toast.success("Order updated");
      } else {
        await createMutation.mutateAsync({
          orderNumber: form.orderNumber,
          productType: form.productType,
          yarnCountNe: BigInt(Math.round(Number(form.yarnCountNe))),
          twistDirection: form.twistDirection,
          quantityKg: BigInt(Math.round(Number(form.quantityKg))),
          targetDate: targetTs,
          status: OS.pending,
        });
        toast.success("Order created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Operation failed");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Order deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            data-ocid="orders.empty_state"
            icon={<ClipboardList className="w-7 h-7" />}
            title="No production orders"
            description="Create your first production order to begin tracking yarn manufacturing."
            actionLabel="Create Order"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Order #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Product Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Yarn Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Twist
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
              {orders.map((order, idx) => (
                <TableRow
                  key={String(order.id)}
                  data-ocid={`orders.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono-nums font-medium">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="capitalize">
                    {order.productType}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(order.yarnCountNe)}
                  </TableCell>
                  <TableCell className="uppercase font-mono-nums">
                    {order.twistDirection}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`orders.edit_button.${idx + 1}`}
                        onClick={() => openEdit(order)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`orders.delete_button.${idx + 1}`}
                        onClick={() => setDeleteId(order.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="orders.dialog" className="sm:max-w-lg">
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
                  placeholder="PO-2024-001"
                  required
                />
              </div>
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
                    <SelectItem value={PT.carded}>Carded</SelectItem>
                    <SelectItem value={PT.combed}>Combed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ord-ne">Yarn Count (Ne)</Label>
                <Input
                  id="ord-ne"
                  type="number"
                  min="1"
                  value={form.yarnCountNe}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yarnCountNe: e.target.value }))
                  }
                  placeholder="30"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-twist">Twist Direction</Label>
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
                    <SelectItem value={TD.s}>S-Twist</SelectItem>
                    <SelectItem value={TD.z}>Z-Twist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              {editItem && (
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
                      <SelectItem value={OS.pending}>Pending</SelectItem>
                      <SelectItem value={OS.inProgress}>In Progress</SelectItem>
                      <SelectItem value={OS.completed}>Completed</SelectItem>
                      <SelectItem value={OS.cancelled}>Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
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
