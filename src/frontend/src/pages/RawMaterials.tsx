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
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RawMaterial, RawMaterialStatus } from "../backend.d";
import { RawMaterialStatus as RMS } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAddRawMaterial,
  useDeleteRawMaterial,
  useRawMaterials,
  useUpdateRawMaterial,
} from "../hooks/useQueries";

const defaultForm = {
  lotNumber: "",
  supplier: "",
  grade: "",
  weightKg: "",
  status: RMS.available as RawMaterialStatus,
};

export default function RawMaterials() {
  const { data: materials = [], isLoading } = useRawMaterials();
  const addMutation = useAddRawMaterial();
  const updateMutation = useUpdateRawMaterial();
  const deleteMutation = useDeleteRawMaterial();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: RawMaterial) {
    setEditItem(item);
    setForm({
      lotNumber: item.lotNumber,
      supplier: item.supplier,
      grade: item.grade,
      weightKg: String(Number(item.weightKg)),
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          lotNumber: form.lotNumber,
          supplier: form.supplier,
          grade: form.grade,
          weightKg: BigInt(Math.round(Number(form.weightKg))),
          status: form.status,
        });
        toast.success("Raw material updated");
      } else {
        await addMutation.mutateAsync({
          lotNumber: form.lotNumber,
          supplier: form.supplier,
          grade: form.grade,
          weightKg: BigInt(Math.round(Number(form.weightKg))),
        });
        toast.success("Raw material added");
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
      toast.success("Raw material deleted");
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
        title="Raw Materials"
        description="Manage cotton bales and raw material inventory"
        action={
          <Button
            data-ocid="rawmaterials.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Raw Material
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
        ) : materials.length === 0 ? (
          <EmptyState
            data-ocid="rawmaterials.empty_state"
            icon={<Package className="w-7 h-7" />}
            title="No raw materials yet"
            description="Add your first cotton bale or raw material lot to get started."
            actionLabel="Add Raw Material"
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
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Grade
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Weight (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date Received
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
              {materials.map((item, idx) => (
                <TableRow
                  key={String(item.id)}
                  data-ocid={`rawmaterials.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono-nums font-medium">
                    {item.lotNumber}
                  </TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.grade}</TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(
                      Number(item.dateReceived) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`rawmaterials.edit_button.${idx + 1}`}
                        onClick={() => openEdit(item)}
                        className="h-8 w-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`rawmaterials.delete_button.${idx + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="rawmaterials.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Raw Material" : "Add Raw Material"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rm-lot">Lot Number</Label>
                <Input
                  id="rm-lot"
                  data-ocid="rawmaterials.input"
                  value={form.lotNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lotNumber: e.target.value }))
                  }
                  placeholder="LOT-2024-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rm-grade">Grade</Label>
                <Input
                  id="rm-grade"
                  value={form.grade}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, grade: e.target.value }))
                  }
                  placeholder="A-Grade, B-Grade..."
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-supplier">Supplier</Label>
              <Input
                id="rm-supplier"
                value={form.supplier}
                onChange={(e) =>
                  setForm((p) => ({ ...p, supplier: e.target.value }))
                }
                placeholder="Supplier name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rm-weight">Weight (kg)</Label>
                <Input
                  id="rm-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
              {editItem && (
                <div className="space-y-1.5">
                  <Label htmlFor="rm-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, status: v as RawMaterialStatus }))
                    }
                  >
                    <SelectTrigger
                      id="rm-status"
                      data-ocid="rawmaterials.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RMS.available}>Available</SelectItem>
                      <SelectItem value={RMS.inUse}>In Use</SelectItem>
                      <SelectItem value={RMS.consumed}>Consumed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="rawmaterials.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="rawmaterials.submit_button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Raw Material"
        description="This will permanently delete this raw material record. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
