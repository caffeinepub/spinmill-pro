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
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Warehouse } from "../backend.d";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import {
  useTransferWarehouseStock,
  useWarehouseStock,
  useWarehouseTransfers,
} from "../hooks/useQueries";

const WAREHOUSE_OPTIONS: { value: string; label: string }[] = [
  { value: "oeRawMaterial", label: "OE Raw Material" },
  { value: "ringRawMaterial", label: "Ring Raw Material" },
];

function warehouseLabel(w: string): string {
  if (w === "oeRawMaterial") return "OE Raw Material";
  if (w === "ringRawMaterial") return "Ring Raw Material";
  return String(w);
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function formatDate(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function WarehouseTransfer() {
  const { materialNames } = useDropdownOptionsContext();
  const { data: stockList = [], isLoading: stockLoading } = useWarehouseStock();
  const { data: transfers = [], isLoading: transfersLoading } =
    useWarehouseTransfers();
  const transferMutation = useTransferWarehouseStock();

  const [materialName, setMaterialName] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [qty, setQty] = useState("");
  const [transferDate, setTransferDate] = useState(todayStr());
  const [remarks, setRemarks] = useState("");

  // Compute available stock for selected material + fromWarehouse
  const availableStock = stockList
    .filter(
      (s) =>
        s.materialName === materialName &&
        (s.warehouse as string) === fromWarehouse,
    )
    .reduce((sum, s) => sum + Number(s.totalQty), 0);

  function resetForm() {
    setMaterialName("");
    setFromWarehouse("");
    setToWarehouse("");
    setQty("");
    setTransferDate(todayStr());
    setRemarks("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!materialName || !fromWarehouse || !toWarehouse || !qty) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast.error("Source and destination warehouses must be different.");
      return;
    }
    const qtyNum = Number.parseInt(qty, 10);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }
    const dateMs = new Date(transferDate).getTime();
    try {
      await transferMutation.mutateAsync({
        materialName,
        fromWarehouse: fromWarehouse as Warehouse,
        toWarehouse: toWarehouse as Warehouse,
        qty: BigInt(qtyNum),
        transferDate: BigInt(dateMs) * 1_000_000n,
        remarks,
      });
      toast.success("Transfer recorded successfully.");
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Transfer failed: ${msg}`);
    }
  }

  // Stock summary cards
  const stockByWarehouse: Record<string, Record<string, number>> = {};
  for (const s of stockList) {
    const wh = s.warehouse as string;
    if (!stockByWarehouse[wh]) stockByWarehouse[wh] = {};
    stockByWarehouse[wh][s.materialName] =
      (stockByWarehouse[wh][s.materialName] ?? 0) + Number(s.totalQty);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Warehouse Transfer"
        description="Transfer raw material stock between warehouses"
      />

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WAREHOUSE_OPTIONS.map((wh) => (
          <div
            key={wh.value}
            className="rounded-lg border bg-card p-4"
            data-ocid={`warehouse_transfer.${wh.value}.card`}
          >
            <h3 className="font-semibold text-sm text-foreground mb-3">
              {wh.label}
            </h3>
            {stockLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-1.5">
                {Object.entries(stockByWarehouse[wh.value] ?? {}).length ===
                0 ? (
                  <p className="text-xs text-muted-foreground">
                    No stock available
                  </p>
                ) : (
                  Object.entries(stockByWarehouse[wh.value] ?? {}).map(
                    ([mat, qty]) => (
                      <div
                        key={mat}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{mat}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {qty.toLocaleString()} kg
                        </Badge>
                      </div>
                    ),
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transfer Form */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-sm mb-4">New Transfer</h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-material">Material Name *</Label>
            <Select
              value={materialName}
              onValueChange={setMaterialName}
              data-ocid="warehouse_transfer.material.select"
            >
              <SelectTrigger id="wt-material">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {materialNames.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-from">From Warehouse *</Label>
            <Select
              value={fromWarehouse}
              onValueChange={setFromWarehouse}
              data-ocid="warehouse_transfer.from_warehouse.select"
            >
              <SelectTrigger id="wt-from">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-to">To Warehouse *</Label>
            <Select
              value={toWarehouse}
              onValueChange={setToWarehouse}
              data-ocid="warehouse_transfer.to_warehouse.select"
            >
              <SelectTrigger id="wt-to">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_OPTIONS.filter((w) => w.value !== fromWarehouse).map(
                  (w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-qty">
              Quantity (kg) *
              {materialName && fromWarehouse && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Available: {availableStock.toLocaleString()} kg
                </span>
              )}
            </Label>
            <Input
              id="wt-qty"
              type="number"
              min={1}
              max={availableStock || undefined}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter quantity"
              data-ocid="warehouse_transfer.qty.input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wt-date">Transfer Date *</Label>
            <Input
              id="wt-date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              data-ocid="warehouse_transfer.date.input"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
            <Label htmlFor="wt-remarks">Remarks</Label>
            <Textarea
              id="wt-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
              rows={1}
              data-ocid="warehouse_transfer.remarks.textarea"
            />
          </div>

          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button
              type="submit"
              disabled={transferMutation.isPending}
              data-ocid="warehouse_transfer.submit_button"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Transfer Stock
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Transfer History */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Transfer History</h2>
        </div>
        {transfersLoading ? (
          <div className="p-4 space-y-2">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-10 w-full" />
            ))}
          </div>
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-8 h-8" />}
            title="No transfers yet"
            description="Transfer records will appear here after you submit a transfer."
            data-ocid="warehouse_transfer.history.empty_state"
          />
        ) : (
          <Table data-ocid="warehouse_transfer.history.table">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Qty (kg)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...transfers].reverse().map((t, i) => (
                <TableRow
                  key={String(t.id)}
                  data-ocid={`warehouse_transfer.history.row.${i + 1}`}
                >
                  <TableCell className="text-muted-foreground text-xs">
                    {String(t.id)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(t.transferDate)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {t.materialName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {warehouseLabel(t.fromWarehouse as string)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {warehouseLabel(t.toWarehouse as string)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(t.qty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {t.remarks || "—"}
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
