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
import {
  Activity,
  Loader2,
  Pause,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Machine, MachineStatus, MachineType } from "../backend.d";
import { MachineStatus as MS, MachineType as MT } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  useDeleteMachine,
  useMachines,
  useProductionOrders,
  useRegisterMachine,
  useUpdateMachine,
} from "../hooks/useQueries";

const machineTypeLabels: Record<string, string> = {
  blowroom: "Blow Room",
  carding: "Carding",
  drawing: "Drawing",
  combing: "Combing",
  roving: "Roving",
  ringFrame: "Ring Frame",
  winding: "Winding",
};

const defaultForm = {
  name: "",
  machineType: MT.ringFrame as MachineType,
  machineNumber: "",
  status: MS.idle as MachineStatus,
  currentOrderId: "",
};

export default function Machines() {
  const { data: machines = [], isLoading } = useMachines();
  const { data: orders = [] } = useProductionOrders();
  const registerMutation = useRegisterMachine();
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Machine | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  const running = machines.filter((m) => m.status === MS.running).length;
  const idle = machines.filter((m) => m.status === MS.idle).length;
  const maintenance = machines.filter(
    (m) => m.status === MS.maintenance,
  ).length;

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: Machine) {
    setEditItem(item);
    setForm({
      name: item.name,
      machineType: item.machineType,
      machineNumber: item.machineNumber,
      status: item.status,
      currentOrderId: item.currentOrderId
        ? String(Number(item.currentOrderId))
        : "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const orderId = form.currentOrderId ? BigInt(form.currentOrderId) : null;
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          name: form.name,
          machineType: form.machineType,
          machineNumber: form.machineNumber,
          status: form.status,
          currentOrderId: orderId,
        });
        toast.success("Machine updated");
      } else {
        await registerMutation.mutateAsync({
          name: form.name,
          machineType: form.machineType,
          machineNumber: form.machineNumber,
          status: form.status,
          currentOrderId: orderId,
        });
        toast.success("Machine registered");
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
      toast.success("Machine removed");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  const isPending = registerMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Machines"
        description="Register and monitor all spinning mill equipment"
        action={
          <Button
            data-ocid="machines.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Machine
          </Button>
        }
      />

      {/* Summary Cards */}
      {!isLoading && machines.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{running}</p>
                <p className="text-xs text-muted-foreground">Running</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Pause className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{idle}</p>
                <p className="text-xs text-muted-foreground">Idle</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{maintenance}</p>
                <p className="text-xs text-muted-foreground">Maintenance</p>
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
        ) : machines.length === 0 ? (
          <EmptyState
            data-ocid="machines.empty_state"
            icon={<Settings2 className="w-7 h-7" />}
            title="No machines registered"
            description="Register your first machine to start tracking production operations."
            actionLabel="Register Machine"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Machine #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Name
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Current Order
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine, idx) => {
                const currentOrder = machine.currentOrderId
                  ? orders.find((o) => o.id === machine.currentOrderId)
                  : null;
                return (
                  <TableRow
                    key={String(machine.id)}
                    data-ocid={`machines.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono-nums font-medium">
                      {machine.machineNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {machine.name}
                    </TableCell>
                    <TableCell>
                      {machineTypeLabels[machine.machineType] ??
                        machine.machineType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={machine.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {currentOrder ? currentOrder.orderNumber : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`machines.edit_button.${idx + 1}`}
                          onClick={() => openEdit(machine)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`machines.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(machine.id)}
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
        <DialogContent data-ocid="machines.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Machine" : "Register Machine"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mc-num">Machine Number</Label>
                <Input
                  id="mc-num"
                  data-ocid="machines.input"
                  value={form.machineNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, machineNumber: e.target.value }))
                  }
                  placeholder="RF-001"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-name">Machine Name</Label>
                <Input
                  id="mc-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ring Frame 1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mc-type">Machine Type</Label>
                <Select
                  value={form.machineType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, machineType: v as MachineType }))
                  }
                >
                  <SelectTrigger id="mc-type" data-ocid="machines.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(machineTypeLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as MachineStatus }))
                  }
                >
                  <SelectTrigger id="mc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MS.running}>Running</SelectItem>
                    <SelectItem value={MS.idle}>Idle</SelectItem>
                    <SelectItem value={MS.maintenance}>Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {orders.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="mc-order">Current Order (optional)</Label>
                <Select
                  value={form.currentOrderId || "none"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      currentOrderId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger id="mc-order">
                    <SelectValue placeholder="Select order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {orders.map((o) => (
                      <SelectItem
                        key={String(o.id)}
                        value={String(Number(o.id))}
                      >
                        {o.orderNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="machines.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="machines.submit_button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Machine"
        description="This will permanently remove this machine record. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
