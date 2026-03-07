import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddBatchStage,
  useBatchStages,
  useDeleteBatchStage,
  useMachines,
  useUpdateBatchStage,
} from "../hooks/useQueries";
import type { BatchStage, ProcessStage } from "../types";
import { ProcessStage as PS } from "../types";

const PROCESS_STAGES_ORDER: ProcessStage[] = [
  PS.blowroom,
  PS.carding,
  PS.drawing,
  PS.combing,
  PS.roving,
  PS.ringSpinning,
  PS.winding,
  PS.qualityCheck,
  PS.finished,
];

const stageLabels: Record<string, string> = {
  blowroom: "Blow Room",
  carding: "Carding",
  drawing: "Drawing",
  combing: "Combing",
  roving: "Roving",
  ringSpinning: "Ring Spinning",
  winding: "Winding",
  qualityCheck: "Quality Check",
  finished: "Finished",
};

const defaultForm = {
  batchId: "",
  stage: PS.blowroom as ProcessStage,
  weightInKg: "",
  weightOutKg: "",
  machineId: "",
  operatorNotes: "",
};

export default function BatchTracking() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: stages = [], isLoading } = useBatchStages();
  const { data: machines = [] } = useMachines();
  const addMutation = useAddBatchStage();
  const updateMutation = useUpdateBatchStage();
  const deleteMutation = useDeleteBatchStage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BatchStage | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Group stages by batchId
  const batchGroups = stages.reduce<Record<string, BatchStage[]>>((acc, s) => {
    const key = String(Number(s.batchId));
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const batchIds = Object.keys(batchGroups).sort(
    (a, b) => Number(a) - Number(b),
  );

  const displayedBatch = selectedBatch ?? batchIds[0] ?? null;
  const displayedStages = displayedBatch
    ? (batchGroups[displayedBatch] ?? [])
    : [];

  // Get stage index for a given stage key
  const getStageIndex = (stage: ProcessStage) =>
    PROCESS_STAGES_ORDER.indexOf(stage);
  const maxStageIndex = displayedStages.reduce(
    (max, s) => Math.max(max, getStageIndex(s.stage)),
    -1,
  );

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: BatchStage) {
    setEditItem(item);
    setForm({
      batchId: String(Number(item.batchId)),
      stage: item.stage,
      weightInKg: String(Number(item.weightInKg)),
      weightOutKg: String(Number(item.weightOutKg)),
      machineId: String(Number(item.machineId)),
      operatorNotes: item.operatorNotes,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = BigInt(Date.now()) * 1_000_000n;
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem.id,
          batchId: BigInt(form.batchId),
          stage: form.stage,
          weightInKg: BigInt(Math.round(Number(form.weightInKg))),
          weightOutKg: BigInt(Math.round(Number(form.weightOutKg))),
          machineId: BigInt(form.machineId),
          startTime: editItem.startTime,
          endTime: now,
          operatorNotes: form.operatorNotes,
        });
        toast.success("Batch stage updated");
      } else {
        await addMutation.mutateAsync({
          batchId: BigInt(form.batchId),
          stage: form.stage,
          weightInKg: BigInt(Math.round(Number(form.weightInKg))),
          weightOutKg: BigInt(Math.round(Number(form.weightOutKg))),
          machineId: BigInt(form.machineId),
          startTime: now,
          endTime: now,
          operatorNotes: form.operatorNotes,
        });
        toast.success("Batch stage logged");
      }
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
      toast.success("Batch stage removed");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Batch Tracking"
        description="Track cotton batches through each manufacturing stage"
        action={
          <Button
            data-ocid="batch.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Stage
          </Button>
        }
      />

      {/* Process Flow Stepper */}
      {displayedBatch && (
        <Card className="mb-6 border-border/60 shadow-card overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Batch #{displayedBatch} — Process Flow
              </CardTitle>
              {batchIds.length > 1 && (
                <Select
                  value={displayedBatch ?? ""}
                  onValueChange={setSelectedBatch}
                >
                  <SelectTrigger
                    className="w-36 h-7 text-xs"
                    data-ocid="batch.select"
                  >
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchIds.map((bid) => (
                      <SelectItem key={bid} value={bid}>
                        Batch #{bid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center overflow-x-auto pb-2 gap-0">
              {PROCESS_STAGES_ORDER.map((stage, idx) => {
                const stageEntry = displayedStages.find(
                  (s) => s.stage === stage,
                );
                const isCompleted = idx <= maxStageIndex;
                const isCurrent = idx === maxStageIndex;
                return (
                  <div key={stage} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-muted border-border text-muted-foreground",
                          isCurrent && "animate-pulse-glow",
                        )}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <div className="text-center">
                        <p
                          className={cn(
                            "text-[10px] font-semibold w-16 leading-tight text-center",
                            isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {stageLabels[stage]}
                        </p>
                        {stageEntry && (
                          <p className="text-[9px] text-muted-foreground text-center">
                            {Number(stageEntry.weightOutKg)}kg
                          </p>
                        )}
                      </div>
                    </div>
                    {idx < PROCESS_STAGES_ORDER.length - 1 && (
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 flex-shrink-0 mx-1",
                          idx < maxStageIndex ? "text-primary" : "text-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <EmptyState
            data-ocid="batch.empty_state"
            icon={<Layers className="w-7 h-7" />}
            title="No batch stages logged"
            description="Start tracking your first cotton batch through the spinning process."
            actionLabel="Log Stage"
            onAction={openAdd}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Batch ID
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Stage
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Weight In (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Weight Out (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Machine
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Start Time
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Notes
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage, idx) => {
                const machine = machines.find((m) => m.id === stage.machineId);
                return (
                  <TableRow
                    key={String(stage.id)}
                    data-ocid={`batch.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono-nums font-medium">
                      #{Number(stage.batchId)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={stage.stage} />
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(stage.weightInKg)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(stage.weightOutKg)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {machine ? machine.name : `#${Number(stage.machineId)}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(
                        Number(stage.startTime) / 1_000_000,
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {stage.operatorNotes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`batch.edit_button.${idx + 1}`}
                          onClick={() => openEdit(stage)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`batch.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(stage.id)}
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
        <DialogContent data-ocid="batch.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Batch Stage" : "Log Batch Stage"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bt-batch">Batch ID</Label>
                <Input
                  id="bt-batch"
                  type="number"
                  min="1"
                  data-ocid="batch.input"
                  value={form.batchId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, batchId: e.target.value }))
                  }
                  placeholder="1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-stage">Process Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, stage: v as ProcessStage }))
                  }
                >
                  <SelectTrigger id="bt-stage" data-ocid="batch.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_STAGES_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {stageLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bt-win">Weight In (kg)</Label>
                <Input
                  id="bt-win"
                  type="number"
                  min="0"
                  value={form.weightInKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightInKg: e.target.value }))
                  }
                  placeholder="500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bt-wout">Weight Out (kg)</Label>
                <Input
                  id="bt-wout"
                  type="number"
                  min="0"
                  value={form.weightOutKg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weightOutKg: e.target.value }))
                  }
                  placeholder="480"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bt-machine">Machine</Label>
              <Select
                value={form.machineId || "none"}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, machineId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger id="bt-machine">
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
              <Label htmlFor="bt-notes">Operator Notes</Label>
              <Textarea
                id="bt-notes"
                data-ocid="batch.textarea"
                value={form.operatorNotes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, operatorNotes: e.target.value }))
                }
                placeholder="Any observations or notes..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="batch.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="batch.submit_button"
                disabled={isPending || !form.machineId}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Log Stage"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Batch Stage"
        description="This will permanently remove this batch stage record."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
