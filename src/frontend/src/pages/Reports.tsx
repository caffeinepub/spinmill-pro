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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  BarChart2,
  Box,
  CalendarRange,
  Download,
  FileText,
  Package,
  PackageOpen,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  BatchStage,
  InwardEntry,
  Machine,
  ProductionLog,
  PurchaseOrder,
  RawMaterial,
} from "../backend.d";
import { RawMaterialStatus, Warehouse as WarehouseEnum } from "../backend.d";
import {
  useBatchStages,
  useInwardEntries,
  useMachines,
  useProductionLogs,
  usePurchaseOrders,
  useRawMaterials,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bigintToDate(ns: bigint): Date {
  return new Date(Number(ns / 1_000_000n));
}

function toDateKey(d: Date): string {
  return d.toISOString().substring(0, 10);
}

function formatDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateFromNs(ns: bigint): string {
  return new Date(Number(ns) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateKey(d);
}

function defaultToDate(): string {
  return toDateKey(new Date());
}

function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  ocid,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  ocid: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="rounded-xl border border-border/60 bg-card p-4 flex items-start gap-3 shadow-sm"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-foreground font-display leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyReport({ message }: { message: string }) {
  return (
    <div
      data-ocid="reports.empty_state"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center mb-3">
        <CalendarRange className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Adjust the date range to see data
      </p>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingReport() {
  return (
    <div data-ocid="reports.loading_state" className="p-4 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ─── Daily Production Report ──────────────────────────────────────────────────

interface DailyProductionRow {
  date: string;
  totalQty: number;
  shifts: number;
  machineIds: Set<bigint>;
  totalEfficiency: number;
  operators: Set<string>;
}

function DailyProductionReport({
  logs,
  machines,
  isLoading,
}: {
  logs: ProductionLog[];
  machines: Machine[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const machineMap = useMemo(
    () => new Map(machines.map((m) => [String(m.id), m.name])),
    [machines],
  );

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();

    const byDate = new Map<string, DailyProductionRow>();
    for (const log of logs) {
      const d = bigintToDate(log.date);
      const ts = d.getTime();
      if (ts < from || ts > to) continue;
      const key = toDateKey(d);
      if (!byDate.has(key)) {
        byDate.set(key, {
          date: key,
          totalQty: 0,
          shifts: 0,
          machineIds: new Set(),
          totalEfficiency: 0,
          operators: new Set(),
        });
      }
      const row = byDate.get(key)!;
      row.totalQty += Number(log.quantityKg);
      row.shifts += 1;
      row.totalEfficiency += Number(log.efficiencyPercent);
      row.machineIds.add(log.machineId);
      row.operators.add(log.operatorName);
    }
    return Array.from(byDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [logs, fromDate, toDate]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + r.totalQty, 0);
    const totalShifts = rows.reduce((s, r) => s + r.shifts, 0);
    const avgEff =
      totalShifts > 0
        ? rows.reduce((s, r) => s + r.totalEfficiency, 0) / totalShifts
        : 0;
    return {
      totalQty,
      totalShifts,
      avgEff: avgEff.toFixed(1),
      totalLogs: rows.length,
    };
  }, [rows]);

  function handleExport() {
    const headers = [
      "Date",
      "Total Qty (kg)",
      "Shifts",
      "Machines Used",
      "Avg Efficiency %",
      "Operators",
    ];
    const csvRows = rows.map((r) => [
      formatDate(r.date),
      r.totalQty,
      r.shifts,
      r.machineIds.size,
      r.shifts > 0 ? (r.totalEfficiency / r.shifts).toFixed(1) : "0",
      Array.from(r.operators).join("; "),
    ]);
    exportCsv(
      `daily-production-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="prod-from" className="text-xs">
            From
          </Label>
          <Input
            id="prod-from"
            type="date"
            data-ocid="reports.production.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prod-to" className="text-xs">
            To
          </Label>
          <Input
            id="prod-to"
            type="date"
            data-ocid="reports.production.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.production.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          ocid="reports.production.card"
          label="Total Production"
          value={`${kpis.totalQty.toLocaleString()} kg`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.production.card"
          label="Total Shifts"
          value={kpis.totalShifts}
          icon={<Zap className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.production.card"
          label="Avg Efficiency"
          value={`${kpis.avgEff}%`}
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.production.card"
          label="Days Logged"
          value={kpis.totalLogs}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No production data in this date range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Total Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Shifts
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Machines Used
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Avg Efficiency %
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Operators
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const avgEff =
                  row.shifts > 0
                    ? (row.totalEfficiency / row.shifts).toFixed(1)
                    : "—";
                const machineNames = Array.from(row.machineIds)
                  .map((id) => machineMap.get(String(id)) ?? `#${String(id)}`)
                  .join(", ");
                return (
                  <TableRow
                    key={row.date}
                    data-ocid={`reports.production.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-medium text-sm">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {row.totalQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.shifts}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <span title={machineNames} className="cursor-default">
                        {row.machineIds.size}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          Number(avgEff) >= 80
                            ? "text-green-600 dark:text-green-400"
                            : Number(avgEff) >= 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {avgEff}
                        {avgEff !== "—" ? "%" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {Array.from(row.operators).join(", ")}
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

// ─── Daily Consumption Report ─────────────────────────────────────────────────

interface DailyConsumptionRow {
  date: string;
  batches: Set<bigint>;
  weightIn: number;
  weightOut: number;
}

function DailyConsumptionReport({
  stages,
  materials,
  isLoading,
}: {
  stages: BatchStage[];
  materials: RawMaterial[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();

    const byDate = new Map<string, DailyConsumptionRow>();
    for (const stage of stages) {
      const d = bigintToDate(stage.startTime);
      const ts = d.getTime();
      if (ts < from || ts > to) continue;
      const key = toDateKey(d);
      if (!byDate.has(key)) {
        byDate.set(key, {
          date: key,
          batches: new Set(),
          weightIn: 0,
          weightOut: 0,
        });
      }
      const row = byDate.get(key)!;
      row.batches.add(stage.batchId);
      row.weightIn += Number(stage.weightInKg);
      row.weightOut += Number(stage.weightOutKg);
    }
    return Array.from(byDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [stages, fromDate, toDate]);

  const kpis = useMemo(() => {
    const totalIn = rows.reduce((s, r) => s + r.weightIn, 0);
    const totalOut = rows.reduce((s, r) => s + r.weightOut, 0);
    const totalBatches = new Set(rows.flatMap((r) => Array.from(r.batches)));
    const waste = totalIn - totalOut;
    return {
      totalIn,
      totalOut,
      totalBatches: totalBatches.size,
      waste: Math.max(0, waste),
    };
  }, [rows]);

  const consumedMaterials = useMemo(
    () => materials.filter((m) => m.status === RawMaterialStatus.consumed),
    [materials],
  );

  function handleExport() {
    const headers = [
      "Date",
      "Batches Processed",
      "Total Weight In (kg)",
      "Total Weight Out (kg)",
      "Waste/Loss (kg)",
      "Waste %",
    ];
    const csvRows = rows.map((r) => {
      const waste = r.weightIn - r.weightOut;
      const wastePct =
        r.weightIn > 0 ? ((waste / r.weightIn) * 100).toFixed(1) : "0";
      return [
        formatDate(r.date),
        r.batches.size,
        r.weightIn,
        r.weightOut,
        Math.max(0, waste),
        wastePct,
      ];
    });
    exportCsv(
      `daily-consumption-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="cons-from" className="text-xs">
            From
          </Label>
          <Input
            id="cons-from"
            type="date"
            data-ocid="reports.consumption.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cons-to" className="text-xs">
            To
          </Label>
          <Input
            id="cons-to"
            type="date"
            data-ocid="reports.consumption.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.consumption.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          ocid="reports.consumption.card"
          label="Total Weight In"
          value={`${kpis.totalIn.toLocaleString()} kg`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.consumption.card"
          label="Total Weight Out"
          value={`${kpis.totalOut.toLocaleString()} kg`}
          icon={<Box className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.consumption.card"
          label="Total Batches"
          value={kpis.totalBatches}
          icon={<Package className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.consumption.card"
          label="Total Waste"
          value={`${kpis.waste.toLocaleString()} kg`}
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Consumption Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No batch stage data in this date range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Batches
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Weight In (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Weight Out (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Waste/Loss (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Waste %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const waste = Math.max(0, row.weightIn - row.weightOut);
                const wastePct =
                  row.weightIn > 0
                    ? ((waste / row.weightIn) * 100).toFixed(1)
                    : "0.0";
                const wastePctNum = Number(wastePct);
                return (
                  <TableRow
                    key={row.date}
                    data-ocid={`reports.consumption.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-medium text-sm">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.batches.size}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {row.weightIn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">
                      {row.weightOut.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-600 dark:text-amber-400">
                      {waste.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          wastePctNum <= 5
                            ? "text-green-600 dark:text-green-400"
                            : wastePctNum <= 10
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {wastePct}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Consumed Raw Materials Section */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold">
              Consumed Raw Materials
            </span>
            {consumedMaterials.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {consumedMaterials.length}
              </Badge>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : consumedMaterials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No raw materials marked as consumed
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot Number
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Grade
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Weight (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumedMaterials.map((mat, idx) => (
                <TableRow
                  key={String(mat.id)}
                  data-ocid={`reports.material.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-medium text-sm font-mono">
                    {mat.lotNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {mat.supplier}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="text-xs">
                      {mat.grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Number(mat.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                      Consumed
                    </Badge>
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

// ─── Inward Raw Material Report ───────────────────────────────────────────────

function warehouseLabel(w: string): string {
  if (w === WarehouseEnum.oeRawMaterial) return "OE Raw Material";
  if (w === WarehouseEnum.ringRawMaterial) return "Ring Raw Material";
  return w;
}

function InwardRawMaterialReport({
  entries,
  purchaseOrders,
  isLoading,
}: {
  entries: InwardEntry[];
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [poFilter, setPoFilter] = useState<string>("");

  const poMap = useMemo(
    () => new Map(purchaseOrders.map((po) => [String(po.id), po])),
    [purchaseOrders],
  );

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();

    return entries.filter((e) => {
      const ts = Number(e.inwardDate) / 1_000_000;
      if (ts < from || ts > to) return false;
      if (
        warehouseFilter !== "all" &&
        (e.warehouse as string) !== warehouseFilter
      )
        return false;
      if (poFilter) {
        const po = poMap.get(String(e.purchaseOrderId));
        if (!po || !po.poNumber.toLowerCase().includes(poFilter.toLowerCase()))
          return false;
      }
      return true;
    });
  }, [entries, fromDate, toDate, warehouseFilter, poFilter, poMap]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.receivedQty), 0);
    const oeQty = rows
      .filter((r) => (r.warehouse as string) === WarehouseEnum.oeRawMaterial)
      .reduce((s, r) => s + Number(r.receivedQty), 0);
    const ringQty = rows
      .filter((r) => (r.warehouse as string) === WarehouseEnum.ringRawMaterial)
      .reduce((s, r) => s + Number(r.receivedQty), 0);
    return { totalQty, oeQty, ringQty, count: rows.length };
  }, [rows]);

  function handleExport() {
    const headers = [
      "Inward No.",
      "PO No.",
      "Supplier",
      "Material",
      "Received Qty (kg)",
      "Warehouse",
      "Vehicle No.",
      "Inward Date",
    ];
    const csvRows = rows.map((r) => {
      const po = poMap.get(String(r.purchaseOrderId));
      return [
        r.inwardNumber,
        po?.poNumber ?? `#${String(r.purchaseOrderId)}`,
        po?.supplier ?? "—",
        r.materialName,
        Number(r.receivedQty),
        warehouseLabel(r.warehouse as string),
        r.vehicleNumber || "—",
        formatDateFromNs(r.inwardDate),
      ];
    });
    exportCsv(
      `inward-rawmaterial-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="iw-from" className="text-xs">
            From
          </Label>
          <Input
            id="iw-from"
            type="date"
            data-ocid="reports.inward.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-to" className="text-xs">
            To
          </Label>
          <Input
            id="iw-to"
            type="date"
            data-ocid="reports.inward.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-warehouse" className="text-xs">
            Warehouse
          </Label>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger
              id="iw-warehouse"
              data-ocid="reports.inward.select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              <SelectItem value={WarehouseEnum.oeRawMaterial}>
                OE Raw Material
              </SelectItem>
              <SelectItem value={WarehouseEnum.ringRawMaterial}>
                Ring Raw Material
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-po" className="text-xs">
            PO Number
          </Label>
          <Input
            id="iw-po"
            data-ocid="reports.inward.input"
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
            placeholder="Filter by PO..."
            className="h-8 text-sm w-36"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.inward.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          ocid="reports.inward.card"
          label="Total Inward Qty"
          value={`${kpis.totalQty.toLocaleString()} kg`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.inward.card"
          label="OE Warehouse"
          value={`${kpis.oeQty.toLocaleString()} kg`}
          icon={<Warehouse className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.inward.card"
          label="Ring Warehouse"
          value={`${kpis.ringQty.toLocaleString()} kg`}
          icon={<Box className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.inward.card"
          label="Total Entries"
          value={kpis.count}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No inward entries in this range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Inward No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  PO No.
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Material
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Received Qty (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Warehouse
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Inward Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry, idx) => {
                const po = poMap.get(String(entry.purchaseOrderId));
                const isOE =
                  (entry.warehouse as string) === WarehouseEnum.oeRawMaterial;
                return (
                  <TableRow
                    key={String(entry.id)}
                    data-ocid={`reports.inward.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {entry.inwardNumber}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {po?.poNumber ?? `#${String(entry.purchaseOrderId)}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po?.supplier ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.materialName}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {Number(entry.receivedQty).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isOE
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 text-xs"
                            : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60 text-xs"
                        }
                      >
                        {warehouseLabel(entry.warehouse as string)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateFromNs(entry.inwardDate)}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const { data: logs = [], isLoading: logsLoading } = useProductionLogs();
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: stages = [], isLoading: stagesLoading } = useBatchStages();
  const { data: materials = [], isLoading: materialsLoading } =
    useRawMaterials();
  const { data: inwardEntries = [], isLoading: inwardLoading } =
    useInwardEntries();
  const { data: purchaseOrders = [], isLoading: poLoading } =
    usePurchaseOrders();

  const productionLoading = logsLoading || machinesLoading;
  const consumptionLoading = stagesLoading || materialsLoading;
  const inwardReportLoading = inwardLoading || poLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground font-display">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Daily production, consumption, and inward analytics
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="production" className="space-y-5">
        <TabsList className="h-9 gap-1 bg-muted/60">
          <TabsTrigger
            value="production"
            data-ocid="reports.production.tab"
            className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Daily Production
          </TabsTrigger>
          <TabsTrigger
            value="consumption"
            data-ocid="reports.consumption.tab"
            className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Package className="w-3.5 h-3.5" />
            Daily Consumption
          </TabsTrigger>
          <TabsTrigger
            value="inward"
            data-ocid="reports.inward.tab"
            className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <PackageOpen className="w-3.5 h-3.5" />
            Inward Raw Material
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="mt-0">
          <DailyProductionReport
            logs={logs}
            machines={machines}
            isLoading={productionLoading}
          />
        </TabsContent>

        <TabsContent value="consumption" className="mt-0">
          <DailyConsumptionReport
            stages={stages}
            materials={materials}
            isLoading={consumptionLoading}
          />
        </TabsContent>

        <TabsContent value="inward" className="mt-0">
          <InwardRawMaterialReport
            entries={inwardEntries}
            purchaseOrders={purchaseOrders}
            isLoading={inwardReportLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
