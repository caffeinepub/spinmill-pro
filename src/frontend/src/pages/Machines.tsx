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
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteMachine,
  useMachines,
  useProductionOrders,
  useRegisterMachine,
  useUpdateMachine,
} from "../hooks/useQueries";
import { MachineType } from "../types";
import type { Machine, MachineStatus } from "../types";

const unitLabels: Record<string, string> = {
  [MachineType.autocoro]: "OE Spinning",
  [MachineType.ringFrame]: "Ring Spinning",
  [MachineType.winding]: "TFO",
  [MachineType.outsideYarn]: "Outside Yarn",
};

const defaultForm = {
  name: "",
  machineType: MachineType.autocoro as MachineType,
  machineNumber: "",
  status: "idle" as MachineStatus,
  currentOrderId: "",
  runningCount: "",
  runningLotNumber: "",
};

export default function Machines() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: machines = [], isLoading } = useMachines();
  const { data: orders = [] } = useProductionOrders();
  const registerMutation = useRegisterMachine();
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Machine | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [unitFilter, setUnitFilter] = useState<string>("all");

  // Order search state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSearchFocused, setOrderSearchFocused] = useState(false);
  const orderSearchRef = useRef<HTMLInputElement>(null);

  const running = machines.filter((m) => m.status === "running").length;
  const idle = machines.filter((m) => m.status === "idle").length;
  const maintenance = machines.filter((m) => m.status === "maintenance").length;

  const selectedOrder = orders.find(
    (o) => String(Number(o.id)) === form.currentOrderId,
  );

  const filteredOrderSuggestions = orderSearch
    ? orders.filter((o) =>
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()),
      )
    : orders.slice(0, 20);

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setOrderSearch("");
    setDialogOpen(true);
  }

  function openEdit(item: Machine) {
    setEditItem(item);
    const orderId = item.currentOrderId
      ? String(Number(item.currentOrderId))
      : "";
    setForm({
      name: item.name,
      machineType: item.machineType,
      machineNumber: item.machineNumber,
      status: item.status,
      currentOrderId: orderId,
      runningCount:
        item.runningCount !== undefined ? String(item.runningCount) : "",
      runningLotNumber: item.runningLotNumber ?? "",
    });
    // Pre-fill search with existing order number
    const existing = orders.find((o) => String(Number(o.id)) === orderId);
    setOrderSearch(existing ? existing.orderNumber : "");
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
    const orderId = form.currentOrderId ? BigInt(form.currentOrderId) : null;
    const isRunning = form.status === "running";
    const runningCount =
      isRunning && form.runningCount ? form.runningCount : null;
    const runningLotNumber =
      isRunning && form.runningLotNumber ? form.runningLotNumber : null;
    try {
      if (editItem) {
        await withRetry(() =>
          updateMutation.mutateAsync({
            id: editItem.id,
            name: form.name,
            machineType: form.machineType,
            machineNumber: form.machineNumber,
            status: form.status,
            currentOrderId: orderId,
            runningCount,
            runningLotNumber,
          }),
        );
        toast.success("Machine updated");
      } else {
        await withRetry(() =>
          registerMutation.mutateAsync({
            name: form.name,
            machineType: form.machineType,
            machineNumber: form.machineNumber,
            status: form.status,
            currentOrderId: orderId,
            runningCount,
            runningLotNumber,
          }),
        );
        toast.success("Machine registered");
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
      toast.success("Machine removed");
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

  const isPending = registerMutation.isPending || updateMutation.isPending;

  const filteredMachines =
    unitFilter === "all"
      ? machines
      : machines.filter((m) => m.machineType === unitFilter);

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

      {/* Unit Filter */}
      {!isLoading && machines.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger
              className="w-48"
              data-ocid="machines.unit_filter.select"
            >
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {Object.entries(unitLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unitFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnitFilter("all")}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          )}
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
                  Unit
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot #
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
              {filteredMachines.map((machine, idx) => {
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
                      {unitLabels[machine.machineType] ?? machine.machineType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={machine.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {machine.status === "running" &&
                      machine.runningCount !== undefined ? (
                        <span className="font-medium">
                          {String(machine.runningCount)}
                        </span>
                      ) : machine.status === "maintenance" ? (
                        <span className="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap">
                          {Number(machine.totalMaintenanceDurationMins) >= 60
                            ? `${Math.floor(Number(machine.totalMaintenanceDurationMins) / 60)}h ${Number(machine.totalMaintenanceDurationMins) % 60}m`
                            : `${Number(machine.totalMaintenanceDurationMins)}m`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {machine.status === "running" &&
                      machine.runningLotNumber ? (
                        <span className="font-medium font-mono-nums">
                          {machine.runningLotNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {currentOrder ? currentOrder.orderNumber : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`machines.edit_button.${idx + 1}`}
                            onClick={() => openEdit(machine)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-ocid={`machines.delete_button.${idx + 1}`}
                            onClick={() => setDeleteId(machine.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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
                <Label htmlFor="mc-type">Unit</Label>
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
                    {Object.entries(unitLabels).map(([val, label]) => (
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
                    setForm((p) => ({
                      ...p,
                      status: v as MachineStatus,
                      ...(v !== "running"
                        ? { runningCount: "", runningLotNumber: "" }
                        : {}),
                    }))
                  }
                >
                  <SelectTrigger id="mc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Order Search */}
            <div className="space-y-1.5">
              <Label htmlFor="mc-order">Current Order (optional)</Label>
              {selectedOrder ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                  <span className="text-sm font-medium flex-1">
                    {selectedOrder.orderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, currentOrderId: "" }));
                      setOrderSearch("");
                      setTimeout(() => orderSearchRef.current?.focus(), 50);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="mc-order"
                    ref={orderSearchRef}
                    data-ocid="machines.search_input"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onFocus={() => setOrderSearchFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setOrderSearchFocused(false), 150)
                    }
                    placeholder="Search order number..."
                    autoComplete="off"
                  />
                  {orderSearchFocused &&
                    filteredOrderSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {filteredOrderSuggestions.map((o) => (
                          <button
                            key={String(o.id)}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onMouseDown={() => {
                              setForm((p) => ({
                                ...p,
                                currentOrderId: String(Number(o.id)),
                              }));
                              setOrderSearch(o.orderNumber);
                              setOrderSearchFocused(false);
                            }}
                          >
                            {o.orderNumber}
                          </button>
                        ))}
                      </div>
                    )}
                  {orderSearchFocused &&
                    orderSearch &&
                    filteredOrderSuggestions.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No orders found
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {form.status === "running" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mc-count">Count (Ne) (optional)</Label>
                  <Input
                    id="mc-count"
                    type="text"
                    data-ocid="machines.input"
                    value={form.runningCount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, runningCount: e.target.value }))
                    }
                    placeholder="e.g. 30/1 or 40@"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mc-lot">Running Lot # (optional)</Label>
                  <Input
                    id="mc-lot"
                    type="text"
                    data-ocid="machines.input"
                    value={form.runningLotNumber}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        runningLotNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g. LOT-2026-001"
                  />
                </div>
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
