import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Boxes, Loader2, Package2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  InventoryStatus,
  TwistDirection,
  YarnInventory as YarnInventoryType,
} from "../backend.d";
import { InventoryStatus as IS, TwistDirection as TD } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAddYarnInventory,
  useDeleteYarnInventory,
  useUpdateYarnInventory,
  useYarnInventory,
} from "../hooks/useQueries";

const defaultForm = {
  lotNumber: "",
  yarnCountNe: "",
  twistDirection: TD.z as TwistDirection,
  quantityCones: "",
  weightKg: "",
  status: IS.inStock as InventoryStatus,
};

export default function YarnInventory() {
  const { data: inventory = [], isLoading } = useYarnInventory();
  const addMutation = useAddYarnInventory();
  const updateMutation = useUpdateYarnInventory();
  const deleteMutation = useDeleteYarnInventory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<YarnInventoryType | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  const totalWeight = inventory.reduce((sum, i) => sum + Number(i.weightKg), 0);
  const inStockCount = inventory.filter((i) => i.status === IS.inStock).length;
  const totalCones = inventory.reduce(
    (sum, i) => sum + Number(i.quantityCones),
    0,
  );

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: YarnInventoryType) {
    setEditItem(item);
    setForm({
      lotNumber: item.lotNumber,
      yarnCountNe: String(Number(item.yarnCountNe)),
      twistDirection: item.twistDirection,
      quantityCones: String(Number(item.quantityCones)),
      weightKg: String(Number(item.weightKg)),
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const args = {
        lotNumber: form.lotNumber,
        yarnCountNe: BigInt(Math.round(Number(form.yarnCountNe))),
        twistDirection: form.twistDirection,
        quantityCones: BigInt(Math.round(Number(form.quantityCones))),
        weightKg: BigInt(Math.round(Number(form.weightKg))),
        status: form.status,
      };
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, ...args });
        toast.success("Yarn inventory updated");
      } else {
        await addMutation.mutateAsync(args);
        toast.success("Yarn lot added to inventory");
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
      toast.success("Yarn lot removed");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yarn Inventory"
        description="Manage finished yarn stock and dispatch records"
        action={
          <Button
            data-ocid="yarn.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Yarn Lot
          </Button>
        }
      />

      {/* Summary Cards */}
      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Package2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {totalWeight.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Weight (kg)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {totalCones.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Cones</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Package2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {inStockCount}
                </p>
                <p className="text-xs text-muted-foreground">Lots In Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            data-ocid="yarn.empty_state"
            icon={<Package2 className="w-7 h-7" />}
            title="No yarn inventory"
            description="Add your first finished yarn lot to start managing your inventory."
            actionLabel="Add Yarn Lot"
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
                  Twist
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Cones
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Weight (kg)
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
              {inventory.map((item, idx) => (
                <TableRow
                  key={String(item.id)}
                  data-ocid={`yarn.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono-nums font-medium">
                    {item.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.yarnCountNe)}
                  </TableCell>
                  <TableCell className="uppercase font-mono-nums font-medium">
                    {item.twistDirection}-Twist
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.quantityCones).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`yarn.edit_button.${idx + 1}`}
                        onClick={() => openEdit(item)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`yarn.delete_button.${idx + 1}`}
                        onClick={() => setDeleteId(item.id)}
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
        <DialogContent data-ocid="yarn.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Yarn Lot" : "Add Yarn Lot"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="yr-lot">Lot Number</Label>
              <Input
                id="yr-lot"
                data-ocid="yarn.input"
                value={form.lotNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lotNumber: e.target.value }))
                }
                placeholder="YRN-2024-001"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="yr-ne">Yarn Count (Ne)</Label>
                <Input
                  id="yr-ne"
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
                <Label htmlFor="yr-twist">Twist Direction</Label>
                <Select
                  value={form.twistDirection}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      twistDirection: v as TwistDirection,
                    }))
                  }
                >
                  <SelectTrigger id="yr-twist" data-ocid="yarn.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TD.s}>S-Twist</SelectItem>
                    <SelectItem value={TD.z}>Z-Twist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="yr-cones">Quantity (Cones)</Label>
                <Input
                  id="yr-cones"
                  type="number"
                  min="0"
                  value={form.quantityCones}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantityCones: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yr-weight">Weight (kg)</Label>
                <Input
                  id="yr-weight"
                  type="number"
                  min="0"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  placeholder="250"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yr-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, status: v as InventoryStatus }))
                }
              >
                <SelectTrigger id="yr-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={IS.inStock}>In Stock</SelectItem>
                  <SelectItem value={IS.dispatched}>Dispatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="yarn.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="yarn.submit_button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Add Lot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Yarn Lot"
        description="This will permanently remove this yarn lot from inventory."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
