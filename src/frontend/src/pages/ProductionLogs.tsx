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
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ProductionLog, Shift } from "../backend.d";
import { Shift as SH } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAddProductionLog,
  useDeleteProductionLog,
  useMachines,
  useProductionLogs,
  useUpdateProductionLog,
} from "../hooks/useQueries";

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

const defaultForm = {
  shift: SH.morning as Shift,
  date: new Date().toISOString().substring(0, 10),
  machineId: "",
  quantityKg: "",
  efficiencyPercent: "",
  operatorName: "",
};

export default function ProductionLogs() {
  const { data: logs = [], isLoading } = useProductionLogs();
  const { data: machines = [] } = useMachines();
  const addMutation = useAddProductionLog();
  const updateMutation = useUpdateProductionLog();
  const deleteMutation = useDeleteProductionLog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductionLog | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: ProductionLog) {
    setEditItem(item);
    const d = new Date(Number(item.date) / 1_000_000);
    setForm({
      shift: item.shift,
      date: d.toISOString().substring(0, 10),
      machineId: String(Number(item.machineId)),
      quantityKg: String(Number(item.quantityKg)),
      efficiencyPercent: String(Number(item.efficiencyPercent)),
      operatorName: item.operatorName,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dateTs = BigInt(new Date(form.date).getTime() * 1_000_000);
    try {
      const args = {
        shift: form.shift,
        date: dateTs,
        machineId: BigInt(form.machineId),
        quantityKg: BigInt(Math.round(Number(form.quantityKg))),
        efficiencyPercent: BigInt(Math.round(Number(form.efficiencyPercent))),
        operatorName: form.operatorName,
      };
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, ...args });
        toast.success("Production log updated");
      } else {
        await addMutation.mutateAsync(args);
        toast.success("Production log added");
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
      toast.success("Log deleted");
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
                  Operator
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
                      {log.operatorName}
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
        <DialogContent data-ocid="logs.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Log Entry" : "Add Production Log"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectItem value={SH.morning}>Morning</SelectItem>
                    <SelectItem value={SH.afternoon}>Afternoon</SelectItem>
                    <SelectItem value={SH.night}>Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lg-machine">Machine</Label>
              <Select
                value={form.machineId || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, machineId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger id="lg-machine">
                  <SelectValue placeholder="Select machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={String(m.id)} value={String(Number(m.id))}>
                      {m.name} ({m.machineNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lg-operator">Operator Name</Label>
              <Input
                id="lg-operator"
                value={form.operatorName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, operatorName: e.target.value }))
                }
                placeholder="Rajan Kumar"
                required
              />
            </div>
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
                disabled={isPending || !form.machineId}
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
