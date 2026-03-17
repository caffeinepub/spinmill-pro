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
  useCreateWasteSale,
  useDeleteWasteSale,
  useUpdateWasteSale,
  useWasteEntries,
  useWasteSales,
} from "../hooks/useQueries";
import type { WasteWarehouse } from "../types";

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

export default function WasteSalePage() {
  const { data: sales = [], isLoading } = useWasteSales();
  const { data: entries = [] } = useWasteEntries();
  const createSale = useCreateWasteSale();
  const updateSale = useUpdateWasteSale();
  const deleteSale = useDeleteWasteSale();

  const [editId, setEditId] = useState<bigint | null>(null);
  const [form, setForm] = useState({
    saleDate: todayStr(),
    buyer: "",
    wasteWarehouse: "ringWaste" as string,
    wasteType: "",
    quantityKg: "",
    ratePerKg: "",
    remarks: "",
  });

  const wasteTypes =
    form.wasteWarehouse === "ringWaste" ? RING_WASTE_TYPES : OE_WASTE_TYPES;

  function handleWarehouseChange(wh: string) {
    setForm((f) => ({ ...f, wasteWarehouse: wh, wasteType: "" }));
  }

  // Compute available stock per warehouse+wasteType
  function getAvailableStock(warehouse: string, wasteType: string): number {
    const entryUnit = warehouse === "ringWaste" ? "ringSpinning" : "openend";
    const produced = entries
      .filter(
        (e) =>
          (e.spinningUnit as string) === entryUnit && e.wasteType === wasteType,
      )
      .reduce((sum, e) => sum + Number(e.quantityKg), 0);
    const sold = sales
      .filter(
        (s) =>
          (s.wasteWarehouse as string) === warehouse &&
          s.wasteType === wasteType,
      )
      .reduce((sum, s) => sum + Number(s.quantityKg), 0);
    return Math.max(0, produced - sold);
  }

  const selectedAvailable = form.wasteType
    ? getAvailableStock(form.wasteWarehouse, form.wasteType)
    : null;

  function handleEdit(sale: (typeof sales)[0]) {
    setEditId(sale.id);
    setForm({
      saleDate: new Date(Number(sale.saleDate) / 1_000_000)
        .toISOString()
        .substring(0, 10),
      buyer: sale.buyer,
      wasteWarehouse: sale.wasteWarehouse as string,
      wasteType: sale.wasteType,
      quantityKg: String(sale.quantityKg),
      ratePerKg: String(sale.ratePerKg),
      remarks: sale.remarks,
    });
  }

  function handleCancel() {
    setEditId(null);
    setForm({
      saleDate: todayStr(),
      buyer: "",
      wasteWarehouse: "ringWaste",
      wasteType: "",
      quantityKg: "",
      ratePerKg: "",
      remarks: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.buyer.trim()) {
      toast.error("Enter buyer name");
      return;
    }
    if (!form.wasteType) {
      toast.error("Select waste type");
      return;
    }
    const qty = Number.parseInt(form.quantityKg);
    const rate = Number.parseInt(form.ratePerKg);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter valid quantity");
      return;
    }
    if (Number.isNaN(rate) || rate < 0) {
      toast.error("Enter valid rate");
      return;
    }

    if (editId === null) {
      const available = getAvailableStock(form.wasteWarehouse, form.wasteType);
      if (qty > available) {
        toast.error(`Insufficient stock. Available: ${available} kg`);
        return;
      }
    }

    const saleDate = BigInt(new Date(form.saleDate).getTime()) * 1_000_000n;
    const wh = form.wasteWarehouse as WasteWarehouse;

    try {
      if (editId !== null) {
        await updateSale.mutateAsync({
          id: editId,
          saleDate,
          buyer: form.buyer,
          wasteWarehouse: wh,
          wasteType: form.wasteType,
          quantityKg: BigInt(qty),
          ratePerKg: BigInt(rate),
          remarks: form.remarks,
        });
        toast.success("Sale updated");
        setEditId(null);
      } else {
        await createSale.mutateAsync({
          saleDate,
          buyer: form.buyer,
          wasteWarehouse: wh,
          wasteType: form.wasteType,
          quantityKg: BigInt(qty),
          ratePerKg: BigInt(rate),
          remarks: form.remarks,
        });
        toast.success("Sale recorded");
      }
      setForm({
        saleDate: todayStr(),
        buyer: "",
        wasteWarehouse: form.wasteWarehouse,
        wasteType: "",
        quantityKg: "",
        ratePerKg: "",
        remarks: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${msg}`);
    }
  }

  async function handleDelete(id: bigint) {
    if (!confirm("Delete this sale record?")) return;
    try {
      await deleteSale.mutateAsync(id);
      toast.success("Sale deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    }
  }

  const recentSales = [...sales].reverse().slice(0, 25);

  return (
    <div className="flex flex-col gap-6 p-6" data-ocid="waste-sale.page">
      <PageHeader
        title="Waste Sale"
        description="Record sale transactions for Ring Waste and OE Waste"
      />

      {/* Sale Form */}
      <form
        onSubmit={handleSubmit}
        className="border rounded-lg p-4 space-y-4"
        data-ocid="waste-sale.form"
      >
        <h3 className="font-semibold">
          {editId !== null ? "Edit Sale" : "New Waste Sale"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Sale Date</Label>
            <Input
              type="date"
              value={form.saleDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, saleDate: e.target.value }))
              }
              data-ocid="waste-sale.sale_date.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Buyer</Label>
            <Input
              placeholder="Buyer name"
              value={form.buyer}
              onChange={(e) =>
                setForm((f) => ({ ...f, buyer: e.target.value }))
              }
              data-ocid="waste-sale.buyer.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Waste Warehouse</Label>
            <Select
              value={form.wasteWarehouse}
              onValueChange={handleWarehouseChange}
            >
              <SelectTrigger data-ocid="waste-sale.warehouse.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ringWaste">Ring Waste Warehouse</SelectItem>
                <SelectItem value="oeWaste">OE Waste Warehouse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Waste Type</Label>
            <Select
              value={form.wasteType}
              onValueChange={(v) => setForm((f) => ({ ...f, wasteType: v }))}
            >
              <SelectTrigger data-ocid="waste-sale.waste_type.select">
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
            {selectedAvailable !== null && (
              <p className="text-xs text-muted-foreground">
                Available:{" "}
                <span className="font-medium">{selectedAvailable} kg</span>
              </p>
            )}
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
              data-ocid="waste-sale.quantity.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Rate per kg (₹)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Rate"
              value={form.ratePerKg}
              onChange={(e) =>
                setForm((f) => ({ ...f, ratePerKg: e.target.value }))
              }
              data-ocid="waste-sale.rate.input"
            />
          </div>
          {form.quantityKg && form.ratePerKg && (
            <div className="space-y-1">
              <Label>Total Amount</Label>
              <div className="h-10 px-3 flex items-center border rounded-md bg-muted text-sm font-medium">
                ₹
                {(
                  Number.parseInt(form.quantityKg || "0") *
                  Number.parseInt(form.ratePerKg || "0")
                ).toLocaleString()}
              </div>
            </div>
          )}
          <div className="space-y-1 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              placeholder="Optional remarks"
              value={form.remarks}
              onChange={(e) =>
                setForm((f) => ({ ...f, remarks: e.target.value }))
              }
              rows={2}
              data-ocid="waste-sale.remarks.textarea"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createSale.isPending || updateSale.isPending}
            data-ocid="waste-sale.submit.button"
          >
            {createSale.isPending || updateSale.isPending
              ? "Saving..."
              : editId !== null
                ? "Update Sale"
                : "Record Sale"}
          </Button>
          {editId !== null && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Sales Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-10" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No Waste Sales"
            description="No waste sale records found."
          />
        ) : (
          <Table data-ocid="waste-sale.table">
            <TableHeader>
              <TableRow>
                <TableHead>Sale No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead>Qty (kg)</TableHead>
                <TableHead>Rate (₹/kg)</TableHead>
                <TableHead>Total (₹)</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={String(sale.id)}>
                  <TableCell className="font-mono text-xs">
                    {sale.saleNumber}
                  </TableCell>
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell className="font-medium">{sale.buyer}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        (sale.wasteWarehouse as string) === "ringWaste"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {(sale.wasteWarehouse as string) === "ringWaste"
                        ? "Ring Waste"
                        : "OE Waste"}
                    </Badge>
                  </TableCell>
                  <TableCell>{sale.wasteType}</TableCell>
                  <TableCell>{String(sale.quantityKg)}</TableCell>
                  <TableCell>₹{String(sale.ratePerKg)}</TableCell>
                  <TableCell className="font-semibold">
                    ₹{Number(sale.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEdit(sale)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(sale.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
