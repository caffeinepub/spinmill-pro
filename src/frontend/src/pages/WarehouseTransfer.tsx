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
import {
  ArrowLeftRight,
  FileText,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Warehouse } from "../backend.d";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useAdminPin } from "../hooks/AdminPinContext";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import {
  useDeleteOutsideTransfer,
  useDeleteWarehouseTransfer,
  useOutsideTransfers,
  useTransferWarehouseStock,
  useTransferWarehouseStockToOutside,
  useWarehouseStock,
  useWarehouseTransfers,
} from "../hooks/useQueries";

const WAREHOUSE_OPTIONS: { value: string; label: string }[] = [
  { value: "oeRawMaterial", label: "OE Raw Material" },
  { value: "ringRawMaterial", label: "Ring Raw Material" },
];

const TO_WAREHOUSE_OPTIONS: { value: string; label: string }[] = [
  ...WAREHOUSE_OPTIONS,
  { value: "outside", label: "Outside" },
];

function warehouseLabel(w: string): string {
  if (w === "oeRawMaterial") return "OE Raw Material";
  if (w === "ringRawMaterial") return "Ring Raw Material";
  if (w === "outside") return "Outside";
  return String(w);
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function formatDate(ns: bigint): string {
  return new Date(Number(ns / 1_000_000n)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function WarehouseTransfer() {
  const { materialNames } = useDropdownOptionsContext();
  const { isAdminUnlocked } = useAdminPin();
  const { data: stockList = [], isLoading: stockLoading } = useWarehouseStock();
  const { data: regularTransfers = [], isLoading: transfersLoading } =
    useWarehouseTransfers();
  const { data: outsideTransfers = [] } = useOutsideTransfers();

  const deleteRegularMutation = useDeleteWarehouseTransfer();
  const deleteOutsideMutation = useDeleteOutsideTransfer();

  // Tab state
  const [activeTab, setActiveTab] = useState<"entry" | "report">("entry");

  // Report filters
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");
  const [reportWarehouse, setReportWarehouse] = useState("all");

  // Merge regular + outside transfers into a unified list for display
  type MergedTransfer = {
    id: bigint;
    rawId: bigint;
    isOutside: boolean;
    materialName: string;
    fromWarehouse: string;
    toWarehouse: string;
    qty: bigint;
    transferDate: bigint;
    remarks: string;
  };

  const allTransfers: MergedTransfer[] = useMemo(
    () =>
      [
        ...regularTransfers.map((t) => ({
          id: t.id,
          rawId: t.id,
          isOutside: false,
          materialName: t.materialName,
          fromWarehouse: t.fromWarehouse as string,
          toWarehouse: t.toWarehouse as string,
          qty: t.qty,
          transferDate: t.transferDate,
          remarks: t.remarks,
        })),
        ...outsideTransfers.map((t) => ({
          id: t.id + BigInt(1_000_000),
          rawId: t.id,
          isOutside: true,
          materialName: t.materialName,
          fromWarehouse: t.fromWarehouse as string,
          toWarehouse: "outside" as string,
          qty: t.qty,
          transferDate: t.transferDate,
          remarks: t.remarks,
        })),
      ].sort((a, b) => Number(b.transferDate) - Number(a.transferDate)),
    [regularTransfers, outsideTransfers],
  );

  // Report filtered transfers
  const filteredTransfers = useMemo(() => {
    let list = allTransfers;
    if (reportFromDate) {
      const from = new Date(reportFromDate).getTime() * 1_000_000;
      list = list.filter((t) => Number(t.transferDate) >= from);
    }
    if (reportToDate) {
      const to = (new Date(reportToDate).getTime() + 86400000) * 1_000_000;
      list = list.filter((t) => Number(t.transferDate) <= to);
    }
    if (gradeSearch.trim()) {
      const q = gradeSearch.trim().toLowerCase();
      list = list.filter((t) => t.materialName.toLowerCase().includes(q));
    }
    if (reportWarehouse !== "all") {
      list = list.filter(
        (t) =>
          t.fromWarehouse === reportWarehouse ||
          t.toWarehouse === reportWarehouse,
      );
    }
    return list;
  }, [
    allTransfers,
    reportFromDate,
    reportToDate,
    gradeSearch,
    reportWarehouse,
  ]);

  const transferMutation = useTransferWarehouseStock();
  const outsideTransferMutation = useTransferWarehouseStockToOutside();

  const [materialName, setMaterialName] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [qty, setQty] = useState("");
  const [transferDate, setTransferDate] = useState(todayStr());
  const [remarks, setRemarks] = useState("");

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
    if (toWarehouse !== "outside" && qtyNum > availableStock) {
      toast.error(
        `Not enough stock available. Available: ${availableStock.toLocaleString()} kg, Requested: ${qtyNum.toLocaleString()} kg`,
      );
      return;
    }
    const dateMs = new Date(transferDate).getTime();
    try {
      if (toWarehouse === "outside") {
        await outsideTransferMutation.mutateAsync({
          materialName,
          fromWarehouse: fromWarehouse as Warehouse,
          qty: BigInt(qtyNum),
          transferDate: BigInt(dateMs) * 1_000_000n,
          remarks,
        });
      } else {
        await transferMutation.mutateAsync({
          materialName,
          fromWarehouse: fromWarehouse as Warehouse,
          toWarehouse: toWarehouse as Warehouse,
          qty: BigInt(qtyNum),
          transferDate: BigInt(dateMs) * 1_000_000n,
          remarks,
        });
      }
      toast.success("Transfer recorded successfully.");
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Transfer failed: ${msg}`);
    }
  }

  async function handleDelete(t: MergedTransfer) {
    if (
      !confirm(
        `Delete transfer of ${Number(t.qty).toLocaleString()} kg of "${t.materialName}"? This will reverse the stock movement.`,
      )
    )
      return;
    try {
      if (t.isOutside) {
        await deleteOutsideMutation.mutateAsync(t.rawId);
      } else {
        await deleteRegularMutation.mutateAsync(t.rawId);
      }
      toast.success("Transfer deleted and stock reversed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Delete failed: ${msg}`);
    }
  }

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
          <div key={wh.value} className="rounded-lg border bg-card p-4">
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

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("entry")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "entry"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
          New Transfer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "report"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />
          Transfer Report
        </button>
      </div>

      {activeTab === "entry" && (
        <>
          {/* Transfer Form */}
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">New Transfer</h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wt-material">Material Name *</Label>
                <Select value={materialName} onValueChange={setMaterialName}>
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
                  onValueChange={(v) => {
                    setFromWarehouse(v);
                    if (toWarehouse === v) setToWarehouse("");
                  }}
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
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger id="wt-to">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {TO_WAREHOUSE_OPTIONS.filter(
                      (w) => w.value !== fromWarehouse,
                    ).map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
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
                  max={
                    toWarehouse !== "outside"
                      ? availableStock || undefined
                      : undefined
                  }
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wt-date">Transfer Date *</Label>
                <Input
                  id="wt-date"
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
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
                />
              </div>

              <div className="flex items-end md:col-span-2 lg:col-span-3">
                <Button
                  type="submit"
                  disabled={
                    transferMutation.isPending ||
                    outsideTransferMutation.isPending
                  }
                >
                  {transferMutation.isPending ||
                  outsideTransferMutation.isPending ? (
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

          {/* Transfer History with delete */}
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
            ) : allTransfers.length === 0 ? (
              <EmptyState
                icon={<ArrowLeftRight className="w-8 h-8" />}
                title="No transfers yet"
                description="Transfer records will appear here after you submit a transfer."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Qty (kg)</TableHead>
                    <TableHead>Remarks</TableHead>
                    {isAdminUnlocked && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTransfers.map((t) => (
                    <TableRow key={String(t.id)}>
                      <TableCell className="text-muted-foreground text-xs">
                        {String(t.rawId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(t.transferDate)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {t.materialName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {warehouseLabel(t.fromWarehouse)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.toWarehouse === "outside"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {warehouseLabel(t.toWarehouse)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {Number(t.qty).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {t.remarks || "—"}
                      </TableCell>
                      {isAdminUnlocked && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(t)}
                            disabled={
                              deleteRegularMutation.isPending ||
                              deleteOutsideMutation.isPending
                            }
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
          </div>
        </>
      )}

      {activeTab === "report" && (
        <div className="rounded-lg border bg-card">
          {/* Report Filters */}
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-sm mb-3">
              Warehouse Transfer Report
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Search Grade / Material</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="e.g. S-6, Cotton..."
                    value={gradeSearch}
                    onChange={(e) => setGradeSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Warehouse</Label>
                <Select
                  value={reportWarehouse}
                  onValueChange={setReportWarehouse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {[...TO_WAREHOUSE_OPTIONS].map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(reportFromDate ||
              reportToDate ||
              gradeSearch ||
              reportWarehouse !== "all") && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReportFromDate("");
                    setReportToDate("");
                    setGradeSearch("");
                    setReportWarehouse("all");
                  }}
                >
                  Clear Filters
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {filteredTransfers.length} record
                  {filteredTransfers.length !== 1 ? "s" : ""} found
                </span>
              </div>
            )}
          </div>

          {/* Report Table */}
          {transfersLoading ? (
            <div className="p-4 space-y-2">
              {["a", "b", "c"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredTransfers.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No records found"
              description="Try adjusting the filters to see transfer records."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Grade / Material</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead>Remarks</TableHead>
                  {isAdminUnlocked && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell className="text-muted-foreground text-xs">
                      {String(t.rawId)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(t.transferDate)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {t.materialName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {warehouseLabel(t.fromWarehouse)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.toWarehouse === "outside"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {warehouseLabel(t.toWarehouse)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(t.qty).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {t.remarks || "—"}
                    </TableCell>
                    {isAdminUnlocked && (
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t)}
                          disabled={
                            deleteRegularMutation.isPending ||
                            deleteOutsideMutation.isPending
                          }
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

          {/* Summary footer */}
          {filteredTransfers.length > 0 && (
            <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredTransfers.length} transfer
                {filteredTransfers.length !== 1 ? "s" : ""}
              </span>
              <span className="font-mono font-semibold">
                Total:{" "}
                {filteredTransfers
                  .reduce((s, t) => s + Number(t.qty), 0)
                  .toLocaleString()}{" "}
                kg
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
