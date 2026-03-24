import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Package, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import {
  useCreateWasteEntry,
  useDeleteWasteEntry,
  useUpdateWasteEntry,
  useWasteEntries,
} from "../hooks/useQueries";
import type { SpinningUnit } from "../types";

const RING_WASTE_TYPES = [
  "Blow Room Droppings",
  "Licker In Droppings",
  "Flat Strips",
  "Microdust",
  "Usable Waste",
  "Hard Waste",
  "Sweeping Waste",
  "Ring Fan",
  "Metal Waste",
];

const OE_WASTE_TYPES = [
  "Lickerin Dropping",
  "Flat Strips",
  "Router Fan",
  "Microdust",
];

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function formatDate(ns: bigint): string {
  try {
    const ms = Number(ns) / 1_000_000;
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export default function WasteProduction() {
  const { data: entries = [], isLoading } = useWasteEntries();
  const createEntry = useCreateWasteEntry();
  const updateEntry = useUpdateWasteEntry();
  const deleteEntry = useDeleteWasteEntry();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [form, setForm] = useState({
    entryDate: todayStr(),
    spinningUnit: "ringSpinning" as string,
    wasteType: "",
    quantityKg: "",
    remarks: "",
  });

  const wasteTypes =
    form.spinningUnit === "ringSpinning" ? RING_WASTE_TYPES : OE_WASTE_TYPES;

  function handleUnitChange(unit: string) {
    setForm((f) => ({ ...f, spinningUnit: unit, wasteType: "" }));
  }

  function handleEdit(entry: (typeof entries)[0]) {
    setEditId(entry.id);
    const unit = entry.spinningUnit as string;
    setForm({
      entryDate: new Date(Number(entry.entryDate) / 1_000_000)
        .toISOString()
        .substring(0, 10),
      spinningUnit: unit,
      wasteType: entry.wasteType,
      quantityKg: String(entry.quantityKg),
      remarks: entry.remarks,
    });
  }

  function handleCancel() {
    setEditId(null);
    setForm({
      entryDate: todayStr(),
      spinningUnit: "ringSpinning",
      wasteType: "",
      quantityKg: "",
      remarks: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wasteType) {
      toast.error("Please select a waste type");
      return;
    }
    const qty = Number.parseInt(form.quantityKg);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    const dateMs = new Date(form.entryDate).getTime();
    const entryDate = BigInt(dateMs) * 1_000_000n;
    const unit = form.spinningUnit as SpinningUnit;

    try {
      if (editId !== null) {
        await updateEntry.mutateAsync({
          id: editId,
          entryDate,
          spinningUnit: unit,
          wasteType: form.wasteType,
          quantityKg: BigInt(qty),
          remarks: form.remarks,
        });
        toast.success("Waste entry updated");
        setEditId(null);
      } else {
        await createEntry.mutateAsync({
          entryDate,
          spinningUnit: unit,
          wasteType: form.wasteType,
          quantityKg: BigInt(qty),
          remarks: form.remarks,
        });
        toast.success("Waste entry saved");
      }
      setForm({
        entryDate: todayStr(),
        spinningUnit: form.spinningUnit,
        wasteType: "",
        quantityKg: "",
        remarks: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${msg}`);
    }
  }

  async function handleDelete(id: bigint) {
    if (!confirm("Delete this waste entry?")) return;
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Entry deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    }
  }

  // Compute waste stock summary
  const ringStock: Record<string, number> = {};
  const oeStock: Record<string, number> = {};
  for (const e of entries) {
    const unit = e.spinningUnit as string;
    const qty = Number(e.quantityKg);
    if (unit === "ringSpinning") {
      ringStock[e.wasteType] = (ringStock[e.wasteType] ?? 0) + qty;
    } else {
      oeStock[e.wasteType] = (oeStock[e.wasteType] ?? 0) + qty;
    }
  }

  const recentEntries = [...entries].reverse().slice(0, 25);

  return (
    <div className="flex flex-col gap-6 p-6" data-ocid="waste-production.page">
      <PageHeader
        title="Waste Production Entry"
        description="Record daily waste production for Ring Spinning and OE Spinning units"
      />

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Ring Waste Warehouse
          </h3>
          {Object.keys(ringStock).length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock yet</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(ringStock).map(([wt, qty]) => (
                <div key={wt} className="flex justify-between text-sm">
                  <span>{wt}</span>
                  <Badge variant="secondary">{qty} kg</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            OE Waste Warehouse
          </h3>
          {Object.keys(oeStock).length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock yet</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(oeStock).map(([wt, qty]) => (
                <div key={wt} className="flex justify-between text-sm">
                  <span>{wt}</span>
                  <Badge variant="secondary">{qty} kg</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entry Form */}
      <form
        onSubmit={handleSubmit}
        className="border rounded-lg p-4 space-y-4"
        data-ocid="waste-production.form"
      >
        <h3 className="font-semibold">
          {editId !== null ? "Edit Entry" : "New Waste Entry"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.entryDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, entryDate: e.target.value }))
              }
              data-ocid="waste-production.entry_date.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Unit</Label>
            <Select value={form.spinningUnit} onValueChange={handleUnitChange}>
              <SelectTrigger data-ocid="waste-production.unit.select">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
                <SelectItem value="openend">OE Spinning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Waste Type</Label>
            <Select
              value={form.wasteType}
              onValueChange={(v) => setForm((f) => ({ ...f, wasteType: v }))}
            >
              <SelectTrigger data-ocid="waste-production.waste_type.select">
                <SelectValue placeholder="Select waste type" />
              </SelectTrigger>
              <SelectContent>
                {wasteTypes.map((wt) => (
                  <SelectItem key={wt} value={wt}>
                    {wt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quantity (kg)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter kg"
              value={form.quantityKg}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantityKg: e.target.value }))
              }
              data-ocid="waste-production.quantity.input"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              placeholder="Optional remarks"
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
              rows={2}
              data-ocid="waste-production.remarks.textarea"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createEntry.isPending || updateEntry.isPending}
            data-ocid="waste-production.submit.button"
          >
            {createEntry.isPending || updateEntry.isPending
              ? "Saving..."
              : editId !== null
                ? "Update Entry"
                : "Save Entry"}
          </Button>
          {editId !== null && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Entries Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-10" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No Waste Entries"
            description="Start by recording today's waste production."
          />
        ) : (
          <Table data-ocid="waste-production.table">
            <TableHeader>
              <TableRow>
                <TableHead>Entry No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead>Qty (kg)</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntries.map((entry) => {
                const unit = entry.spinningUnit as string;
                const warehouse =
                  unit === "ringSpinning" ? "Ring Waste" : "OE Waste";
                return (
                  <TableRow key={String(entry.id)}>
                    <TableCell className="font-mono text-xs">
                      {entry.entryNumber}
                    </TableCell>
                    <TableCell>{formatDate(entry.entryDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {unit === "ringSpinning"
                          ? "Ring Spinning"
                          : "OE Spinning"}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.wasteType}</TableCell>
                    <TableCell className="font-medium">
                      {String(entry.quantityKg)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          unit === "ringSpinning"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {warehouse}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.remarks || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
