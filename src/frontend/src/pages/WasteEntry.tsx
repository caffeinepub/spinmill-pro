import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Recycle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useAdminPin } from "../hooks/AdminPinContext";
import {
  useCreateMaterialIssue,
  useDeleteMaterialIssue,
  useMaterialIssues,
} from "../hooks/useQueries";

// ─── Constants ─────────────────────────────────────────────────────────────────

const WASTE_DEPT = "Waste Production";

const OE_WASTE_TYPES = [
  "Lickerin Dropping",
  "Flat Strips",
  "Microdust",
  "Router Fan",
];

const RING_WASTE_TYPES = [
  "BRD",
  "LRD",
  "Flat Strips",
  "Usable Waste",
  "Microdust",
  "Metal Waste",
  "Hard Waste",
  "Sweeping Waste",
];

type SpinUnit = "OE Spinning" | "Ring Spinning";

const UNIT_CONFIG: Record<
  SpinUnit,
  { warehouse: Warehouse; wasteTypes: string[]; label: string; color: string }
> = {
  "OE Spinning": {
    warehouse: Warehouse.oeRawMaterial,
    wasteTypes: OE_WASTE_TYPES,
    label: "OE Spinning",
    color: "bg-blue-100 text-blue-800",
  },
  "Ring Spinning": {
    warehouse: Warehouse.ringRawMaterial,
    wasteTypes: RING_WASTE_TYPES,
    label: "Ring Spinning",
    color: "bg-purple-100 text-purple-800",
  },
};

function formatDate(ts: bigint): string {
  try {
    const ms = Number(ts / 1_000_000n);
    return new Date(ms).toLocaleDateString("en-IN");
  } catch {
    return "-";
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WasteEntry() {
  const { isAdminUnlocked: isAdmin } = useAdminPin();
  const { data: allIssues = [], isLoading } = useMaterialIssues();
  const createMutation = useCreateMaterialIssue();
  const deleteMutation = useDeleteMaterialIssue();

  // Filter only waste production entries
  const wasteEntries = allIssues
    .filter((i) => i.department === WASTE_DEPT)
    .sort((a, b) => (b.issueDate > a.issueDate ? 1 : -1));

  // Form state
  const [unit, setUnit] = useState<SpinUnit>("OE Spinning");
  const [wasteType, setWasteType] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [search, setSearch] = useState("");

  const config = UNIT_CONFIG[unit];

  function handleUnitChange(newUnit: SpinUnit) {
    setUnit(newUnit);
    setWasteType(""); // reset waste type when unit changes
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wasteType) {
      toast.error("Please select a waste type");
      return;
    }
    if (!qty || Number.isNaN(Number(qty)) || Number(qty) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      const dateMs = new Date(date).getTime();
      const dateNs = BigInt(dateMs) * 1_000_000n;
      const qtyKg = BigInt(Math.round(Number(qty) * 1000)); // store as grams internally

      await createMutation.mutateAsync({
        department: WASTE_DEPT,
        warehouse: config.warehouse,
        materialName: wasteType,
        grade: unit,
        issuedQty: qtyKg,
        remarks: remarks.trim(),
        issueDate: dateNs,
      });

      toast.success("Waste entry saved successfully");
      setWasteType("");
      setQty("");
      setRemarks("");
      setDate(todayISO());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Entry deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = wasteEntries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.materialName.toLowerCase().includes(q) ||
      e.grade.toLowerCase().includes(q) ||
      e.issueNumber.toLowerCase().includes(q)
    );
  });

  const shown = search ? filtered : filtered.slice(0, 25);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Waste Production Entry"
        description="Record daily waste production for OE Spinning and Ring Spinning units"
      />

      {/* Entry Form */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Waste Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Unit Selector */}
            <div className="space-y-1.5">
              <Label>Spinning Unit</Label>
              <div className="flex gap-3">
                {(["OE Spinning", "Ring Spinning"] as SpinUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleUnitChange(u)}
                    className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      unit === u
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Waste Type Selector */}
            <div className="space-y-1.5">
              <Label>Waste Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {config.wasteTypes.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setWasteType(wt)}
                    className={`py-2 px-3 rounded-md border text-xs font-medium transition-all text-left ${
                      wasteType === wt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>
              {wasteType && (
                <p className="text-xs text-muted-foreground">
                  Selected:{" "}
                  <span className="font-medium text-foreground">
                    {wasteType}
                  </span>
                </p>
              )}
            </div>

            {/* Qty, Date, Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="waste-qty">Quantity (kg)</Label>
                <Input
                  id="waste-qty"
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="0.000"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waste-date">Date</Label>
                <Input
                  id="waste-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waste-remarks">Remarks (optional)</Label>
                <Textarea
                  id="waste-remarks"
                  placeholder="Optional remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-9 resize-none"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Save Waste Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Waste Entries</CardTitle>
          <Input
            placeholder="Search waste type, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 h-8 text-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<Recycle className="w-8 h-8" />}
              title="No waste entries yet"
              description="Submit the form above to record waste production."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Waste Type</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead>Remarks</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((e) => (
                  <TableRow key={String(e.id)}>
                    <TableCell className="font-mono text-xs">
                      {e.issueNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(e.issueDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {e.grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{e.materialName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {(Number(e.issuedQty) / 1000).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.remarks || "-"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(e.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!search && wasteEntries.length > 25 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Showing latest 25 of {wasteEntries.length} entries. Use search to
              find older records.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Waste Entry"
        description="Are you sure you want to delete this waste entry? This cannot be undone."
        onConfirm={() => deleteTarget !== null && handleDelete(deleteTarget)}
      />
    </div>
  );
}
