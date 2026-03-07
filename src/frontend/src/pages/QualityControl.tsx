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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddQualityTest,
  useDeleteQualityTest,
  useQualityTests,
  useUpdateQualityTest,
} from "../hooks/useQueries";
import type { QualityTest } from "../types";

const defaultForm = {
  batchId: "",
  csp: "",
  elongationPercent: "",
  evennessPercent: "",
  thinPlaces: "",
  thickPlaces: "",
  neps: "",
  hairinessIndex: "",
  pass: false,
};

export default function QualityControl() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: tests = [], isLoading } = useQualityTests();
  const addMutation = useAddQualityTest();
  const updateMutation = useUpdateQualityTest();
  const deleteMutation = useDeleteQualityTest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<QualityTest | null>(null);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [form, setForm] = useState(defaultForm);

  const passCount = tests.filter((t) => t.pass).length;
  const failCount = tests.filter((t) => !t.pass).length;
  const passRate =
    tests.length > 0 ? Math.round((passCount / tests.length) * 100) : 0;

  function openAdd() {
    setEditItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(item: QualityTest) {
    setEditItem(item);
    setForm({
      batchId: String(Number(item.batchId)),
      csp: String(Number(item.csp)),
      elongationPercent: String(Number(item.elongationPercent)),
      evennessPercent: String(Number(item.evennessPercent)),
      thinPlaces: String(Number(item.thinPlaces)),
      thickPlaces: String(Number(item.thickPlaces)),
      neps: String(Number(item.neps)),
      hairinessIndex: String(Number(item.hairinessIndex)),
      pass: item.pass,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const args = {
        batchId: BigInt(form.batchId),
        csp: BigInt(Math.round(Number(form.csp))),
        elongationPercent: BigInt(Math.round(Number(form.elongationPercent))),
        evennessPercent: BigInt(Math.round(Number(form.evennessPercent))),
        thinPlaces: BigInt(Math.round(Number(form.thinPlaces))),
        thickPlaces: BigInt(Math.round(Number(form.thickPlaces))),
        neps: BigInt(Math.round(Number(form.neps))),
        hairinessIndex: BigInt(Math.round(Number(form.hairinessIndex))),
        pass: form.pass,
      };
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, ...args });
        toast.success("Quality test updated");
      } else {
        await addMutation.mutateAsync(args);
        toast.success("Quality test logged");
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
      toast.success("Quality test deleted");
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
        title="Quality Control"
        description="Log and review yarn quality test results"
        action={
          <Button
            data-ocid="qc.primary_button"
            onClick={openAdd}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Test
          </Button>
        }
      />

      {/* Summary */}
      {!isLoading && tests.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{passCount}</p>
                <p className="text-xs text-muted-foreground">Passed Tests</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{failCount}</p>
                <p className="text-xs text-muted-foreground">Failed Tests</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
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
        ) : tests.length === 0 ? (
          <EmptyState
            data-ocid="qc.empty_state"
            icon={<ShieldCheck className="w-7 h-7" />}
            title="No quality tests logged"
            description="Log your first yarn quality test to start monitoring production quality."
            actionLabel="Log Test"
            onAction={openAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Batch ID
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    CSP
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Elongation %
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Evenness %
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Thin
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Thick
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Neps
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Hairiness
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Result
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test, idx) => (
                  <TableRow
                    key={String(test.id)}
                    data-ocid={`qc.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono-nums font-medium">
                      #{Number(test.batchId)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.csp)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.elongationPercent)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.evennessPercent)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.thinPlaces)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.thickPlaces)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.neps)}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(test.hairinessIndex)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={test.pass ? "pass" : "fail"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`qc.edit_button.${idx + 1}`}
                          onClick={() => openEdit(test)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`qc.delete_button.${idx + 1}`}
                          onClick={() => setDeleteId(test.id)}
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
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="qc.dialog" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Quality Test" : "Log Quality Test"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qc-batch">Batch ID</Label>
              <Input
                id="qc-batch"
                type="number"
                min="1"
                data-ocid="qc.input"
                value={form.batchId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batchId: e.target.value }))
                }
                placeholder="1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qc-csp">CSP (Count Strength Product)</Label>
                <Input
                  id="qc-csp"
                  type="number"
                  min="0"
                  value={form.csp}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, csp: e.target.value }))
                  }
                  placeholder="2400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-elong">Elongation %</Label>
                <Input
                  id="qc-elong"
                  type="number"
                  min="0"
                  max="100"
                  value={form.elongationPercent}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      elongationPercent: e.target.value,
                    }))
                  }
                  placeholder="5"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qc-even">Evenness %</Label>
                <Input
                  id="qc-even"
                  type="number"
                  min="0"
                  max="100"
                  value={form.evennessPercent}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, evennessPercent: e.target.value }))
                  }
                  placeholder="12"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-hair">Hairiness Index</Label>
                <Input
                  id="qc-hair"
                  type="number"
                  min="0"
                  value={form.hairinessIndex}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hairinessIndex: e.target.value }))
                  }
                  placeholder="6"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qc-thin">Thin Places</Label>
                <Input
                  id="qc-thin"
                  type="number"
                  min="0"
                  value={form.thinPlaces}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, thinPlaces: e.target.value }))
                  }
                  placeholder="10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-thick">Thick Places</Label>
                <Input
                  id="qc-thick"
                  type="number"
                  min="0"
                  value={form.thickPlaces}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, thickPlaces: e.target.value }))
                  }
                  placeholder="15"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-neps">Neps</Label>
                <Input
                  id="qc-neps"
                  type="number"
                  min="0"
                  value={form.neps}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, neps: e.target.value }))
                  }
                  placeholder="80"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
              <Switch
                id="qc-pass"
                data-ocid="qc.switch"
                checked={form.pass}
                onCheckedChange={(v) => setForm((p) => ({ ...p, pass: v }))}
              />
              <Label htmlFor="qc-pass" className="cursor-pointer">
                <span className="font-medium">Mark as Passed</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {form.pass
                    ? "This test will be recorded as PASS"
                    : "This test will be recorded as FAIL"}
                </span>
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                data-ocid="qc.cancel_button"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="qc.submit_button"
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editItem ? "Update" : "Log Test"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Quality Test"
        description="This will permanently delete this quality test record."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
