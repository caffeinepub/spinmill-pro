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
  BarChart2,
  BarChart3,
  Box,
  CalendarRange,
  Download,
  FileText,
  Layers,
  Package,
  PackageOpen,
  Recycle,
  Send,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  useDispatchEntries,
  useInwardEntries,
  useMachines,
  useMaterialIssues,
  usePackingEntries,
  useProductionLogs,
  useProductionOrders,
  usePurchaseOrders,
  useYarnCountLabels,
  useYarnOpeningStock,
} from "../hooks/useQueries";
import type {
  DispatchEntry,
  InwardEntry,
  Machine,
  MaterialIssue,
  PackingEntry,
  ProductionLog,
  ProductionOrder,
  PurchaseOrder,
  YarnOpeningStockRecord,
} from "../types";

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

function exportCsvRows(
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

// ─── Label Helpers ─────────────────────────────────────────────────────────────

function warehouseLabel(w: string): string {
  if (w === "oeRawMaterial") return "OE Raw Material";
  if (w === "ringRawMaterial") return "Ring Raw Material";
  return w;
}

function spinningUnitLabel(u: string): string {
  const s = u.toLowerCase();
  if (s === "openend") return "OE Spinning";
  if (s === "ringspinning") return "Ring Spinning";
  if (s === "tfo") return "TFO";
  if (s === "outsideYarn" || s === "outsideyarn") return "Outside Yarn";
  return u;
}

function destinationLabel(d: string): string {
  const map: Record<string, string> = {
    weaving: "Weaving",
    kolhapur: "Kolhapur",
    ambala: "Ambala",
    outside: "Outside",
    amravati: "Amravati",
    softWinding: "Soft Winding",
    softwinding: "Soft Winding",
    tfo: "TFO",
  };
  return map[d] ?? d;
}

function productTypeLabel(p: string): string {
  const map: Record<string, string> = {
    carded: "Carded",
    combed: "Combed",
    polyester: "Polyester",
    bamboo: "Bamboo",
    viscose: "Viscose",
    lt: "LT",
  };
  return map[p.toLowerCase()] ?? p;
}

function endUseLabel(e: string): string {
  const map: Record<string, string> = {
    warp: "Warp",
    weft: "Weft",
    pile: "Pile",
    ground: "Ground",
    tfo: "TFO",
  };
  return map[e.toLowerCase()] ?? e;
}

// ─── Badge Variants ────────────────────────────────────────────────────────────

function WarehouseBadge({ warehouse }: { warehouse: string }) {
  const isOE = warehouse === "oeRawMaterial";
  return (
    <Badge
      variant="outline"
      className={
        isOE
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 text-xs"
          : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60 text-xs"
      }
    >
      {warehouseLabel(warehouse)}
    </Badge>
  );
}

function UnitBadge({ unit }: { unit: string }) {
  const s = unit.toLowerCase();
  const isOE = s === "openend";
  const isTFO = s === "tfo";
  return (
    <Badge
      variant="outline"
      className={
        isOE
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 text-xs"
          : isTFO
            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/60 text-xs"
            : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60 text-xs"
      }
    >
      {spinningUnitLabel(unit)}
    </Badge>
  );
}

function DestinationBadge({ destination }: { destination: string }) {
  return (
    <Badge variant="outline" className="text-xs">
      {destinationLabel(destination)}
    </Badge>
  );
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

// ─── Filter Bar Component ─────────────────────────────────────────────────────

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

// ─── Tab 1: Daily Production Report ───────────────────────────────────────────

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
  const [unitFilter, setUnitFilter] = useState<string>("all");

  const machineMap = useMemo(
    () => new Map(machines.map((m) => [String(m.id), m.name])),
    [machines],
  );

  // Map machineId -> machineType for unit filtering
  const machineTypeMap = useMemo(
    () => new Map(machines.map((m) => [String(m.id), m.machineType as string])),
    [machines],
  );

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();

    // MachineType values: autocoro = OE Spinning, ringFrame = Ring Spinning, winding = TFO
    const unitTypeMap: Record<string, string[]> = {
      oeSpinning: ["autocoro"],
      ringSpinning: ["ringFrame"],
      tfo: ["winding"],
    };

    const byDate = new Map<string, DailyProductionRow>();
    for (const log of logs) {
      const d = bigintToDate(log.date);
      const ts = d.getTime();
      if (ts < from || ts > to) continue;

      // Unit filter
      if (unitFilter !== "all") {
        const mt = machineTypeMap.get(String(log.machineId)) ?? "";
        const allowed = unitTypeMap[unitFilter] ?? [];
        if (!allowed.includes(mt)) continue;
      }

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
  }, [logs, fromDate, toDate, unitFilter, machineTypeMap]);

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
    exportCsvRows(
      `daily-production-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      <FilterBar>
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
        <div className="space-y-1">
          <Label htmlFor="prod-unit" className="text-xs">
            Unit
          </Label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger
              id="prod-unit"
              data-ocid="reports.production.select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="oeSpinning">OE Spinning</SelectItem>
              <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
              <SelectItem value="tfo">TFO</SelectItem>
            </SelectContent>
          </Select>
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
      </FilterBar>

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

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No production data in this date range" />
        ) : (
          <div className="overflow-x-auto">
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
                    Shift Officers
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
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Daily Issue Report (Warehouse-wise) ────────────────────────────────

function DailyIssueReport({
  issues,
  isLoading,
}: {
  issues: MaterialIssue[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");

  const materials = useMemo(
    () =>
      Array.from(
        new Set(issues.map((i) => i.materialName).filter(Boolean)),
      ).sort(),
    [issues],
  );

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();
    return issues.filter((issue) => {
      const ts = Number(issue.issueDate) / 1_000_000;
      if (ts < from || ts > to) return false;
      if (
        warehouseFilter !== "all" &&
        (issue.warehouse as string) !== warehouseFilter
      )
        return false;
      if (materialFilter !== "all" && issue.materialName !== materialFilter)
        return false;
      return true;
    });
  }, [issues, fromDate, toDate, warehouseFilter, materialFilter]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.issuedQty), 0);
    const oeQty = rows
      .filter((r) => (r.warehouse as string) === "oeRawMaterial")
      .reduce((s, r) => s + Number(r.issuedQty), 0);
    const ringQty = rows
      .filter((r) => (r.warehouse as string) === "ringRawMaterial")
      .reduce((s, r) => s + Number(r.issuedQty), 0);
    return { totalQty, oeQty, ringQty, count: rows.length };
  }, [rows]);

  function handleExport() {
    const headers = [
      "Issue No.",
      "Date",
      "Department",
      "Warehouse",
      "Material Name",
      "Grade",
      "Issued Qty (kg)",
      "Remarks",
    ];
    const csvRows = rows.map((r) => [
      r.issueNumber,
      formatDateFromNs(r.issueDate),
      r.department,
      warehouseLabel(r.warehouse as string),
      r.materialName,
      r.grade,
      Number(r.issuedQty),
      r.remarks || "—",
    ]);
    exportCsvRows(`daily-issue-${fromDate}-to-${toDate}.csv`, headers, csvRows);
  }

  return (
    <div className="space-y-5">
      <FilterBar>
        <div className="space-y-1">
          <Label htmlFor="issue-from" className="text-xs">
            From
          </Label>
          <Input
            id="issue-from"
            type="date"
            data-ocid="reports.issue.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="issue-to" className="text-xs">
            To
          </Label>
          <Input
            id="issue-to"
            type="date"
            data-ocid="reports.issue.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="issue-warehouse" className="text-xs">
            Warehouse
          </Label>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger
              id="issue-warehouse"
              data-ocid="reports.issue.select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              <SelectItem value="oeRawMaterial">OE Raw Material</SelectItem>
              <SelectItem value="ringRawMaterial">Ring Raw Material</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="issue-material" className="text-xs">
            Material
          </Label>
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger
              id="issue-material"
              data-ocid="reports.issue.material_select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.issue.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          ocid="reports.issue.card"
          label="Total Issued Qty"
          value={`${kpis.totalQty.toLocaleString()} kg`}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.issue.card"
          label="OE Warehouse Issued"
          value={`${kpis.oeQty.toLocaleString()} kg`}
          icon={<Warehouse className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.issue.card"
          label="Ring Warehouse Issued"
          value={`${kpis.ringQty.toLocaleString()} kg`}
          icon={<Box className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.issue.card"
          label="Total Entries"
          value={kpis.count}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No issue entries in this date range" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Issue No.
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Department
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Warehouse
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Material Name
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Qty (kg)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((issue, idx) => (
                  <TableRow
                    key={String(issue.id)}
                    data-ocid={`reports.issue.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {issue.issueNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateFromNs(issue.issueDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {issue.department}
                    </TableCell>
                    <TableCell>
                      <WarehouseBadge warehouse={issue.warehouse as string} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {issue.materialName}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {Number(issue.issuedQty).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {issue.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 3: Daily Inward Report (Warehouse-wise) ───────────────────────────────

function DailyInwardReport({
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
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");

  const poMap = useMemo(
    () => new Map(purchaseOrders.map((po) => [String(po.id), po])),
    [purchaseOrders],
  );

  const suppliers = useMemo(
    () =>
      Array.from(
        new Set(purchaseOrders.map((po) => po.supplier).filter(Boolean)),
      ).sort(),
    [purchaseOrders],
  );

  const materials = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.materialName).filter(Boolean)),
      ).sort(),
    [entries],
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
      if (supplierFilter !== "all") {
        const po = poMap.get(String(e.purchaseOrderId));
        if (!po || po.supplier !== supplierFilter) return false;
      }
      if (materialFilter !== "all" && e.materialName !== materialFilter)
        return false;
      return true;
    });
  }, [
    entries,
    fromDate,
    toDate,
    warehouseFilter,
    poFilter,
    poMap,
    supplierFilter,
    materialFilter,
  ]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.receivedQty), 0);
    const oeQty = rows
      .filter((r) => (r.warehouse as string) === "oeRawMaterial")
      .reduce((s, r) => s + Number(r.receivedQty), 0);
    const ringQty = rows
      .filter((r) => (r.warehouse as string) === "ringRawMaterial")
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
    exportCsvRows(
      `daily-inward-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      <FilterBar>
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
              <SelectItem value="oeRawMaterial">OE Raw Material</SelectItem>
              <SelectItem value="ringRawMaterial">Ring Raw Material</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-po" className="text-xs">
            PO Number
          </Label>
          <Input
            id="iw-po"
            data-ocid="reports.inward.search_input"
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
            placeholder="Filter by PO..."
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-supplier" className="text-xs">
            Supplier
          </Label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger
              id="iw-supplier"
              data-ocid="reports.inward.supplier_select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="iw-material" className="text-xs">
            Material
          </Label>
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger
              id="iw-material"
              data-ocid="reports.inward.material_select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </FilterBar>

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

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No inward entries in this range" />
        ) : (
          <div className="overflow-x-auto">
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
                        <WarehouseBadge warehouse={entry.warehouse as string} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateFromNs(entry.inwardDate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 4: Daily Packing Report (Unit-wise) ──────────────────────────────────

function DailyPackingReport({
  entries,
  isLoading,
  countLabels,
}: {
  entries: PackingEntry[];
  isLoading: boolean;
  countLabels?: Map<string, string>;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [packingLotSearch, setPackingLotSearch] = useState<string>("");

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();
    return entries.filter((e) => {
      const ts = Number(e.packingDate) / 1_000_000;
      if (ts < from || ts > to) return false;
      if (unitFilter !== "all") {
        const u = (e.spinningUnit as string).toLowerCase();
        if (unitFilter === "openend" && u !== "openend") return false;
        if (
          unitFilter === "ringSpinning" &&
          u !== "ringspinning" &&
          u !== "ringSpinning"
        )
          return false;
        if (unitFilter === "tfo" && u !== "tfo") return false;
        if (unitFilter === "outsideYarn" && u !== "outsideyarn") return false;
      }
      return true;
    });
  }, [entries, fromDate, toDate, unitFilter]);

  const displayRows = useMemo(() => {
    if (!packingLotSearch.trim()) return rows;
    return rows.filter((r) =>
      r.lotNumber.toLowerCase().includes(packingLotSearch.trim().toLowerCase()),
    );
  }, [rows, packingLotSearch]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.quantityKg), 0);
    const oeQty = rows
      .filter((r) => (r.spinningUnit as string).toLowerCase() === "openend")
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    const ringQty = rows
      .filter((r) => {
        const u = (r.spinningUnit as string).toLowerCase();
        return u === "ringspinning";
      })
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    const tfoQty = rows
      .filter((r) => (r.spinningUnit as string).toLowerCase() === "tfo")
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    return { totalQty, oeQty, ringQty, tfoQty, count: rows.length };
  }, [rows]);

  function handleExport() {
    const headers = [
      "Packing No.",
      "Date",
      "Lot #",
      "Count (Ne)",
      "Unit",
      "Product Type",
      "End Use",
      "Qty (kg)",
      "Remarks",
    ];
    const csvRows = rows.map((r) => [
      r.packingNumber,
      formatDateFromNs(r.packingDate),
      r.lotNumber,
      String(r.yarnCountNe),
      spinningUnitLabel(r.spinningUnit as string),
      productTypeLabel(r.productType as string),
      endUseLabel(r.endUse as string),
      Number(r.quantityKg),
      r.remarks || "—",
    ]);
    exportCsvRows(
      `daily-packing-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      <FilterBar>
        <div className="space-y-1">
          <Label htmlFor="pack-from" className="text-xs">
            From
          </Label>
          <Input
            id="pack-from"
            type="date"
            data-ocid="reports.packing.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pack-to" className="text-xs">
            To
          </Label>
          <Input
            id="pack-to"
            type="date"
            data-ocid="reports.packing.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pack-unit" className="text-xs">
            Unit
          </Label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger
              id="pack-unit"
              data-ocid="reports.packing.select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="openend">OE Spinning</SelectItem>
              <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
              <SelectItem value="tfo">TFO</SelectItem>
              <SelectItem value="outsideYarn">Outside Yarn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lot Number</Label>
          <Input
            placeholder="Search lot..."
            data-ocid="reports.packing.search_input"
            value={packingLotSearch}
            onChange={(e) => setPackingLotSearch(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.packing.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          ocid="reports.packing.card"
          label="Total Packed Qty"
          value={`${kpis.totalQty.toLocaleString()} kg`}
          icon={<Package className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.packing.card"
          label="OE Spinning"
          value={`${kpis.oeQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.packing.card"
          label="Ring Spinning"
          value={`${kpis.ringQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.packing.card"
          label="TFO"
          value={`${kpis.tfoQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.packing.card"
          label="Total Entries"
          value={kpis.count}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : displayRows.length === 0 ? (
          <EmptyReport message="No packing entries in this date range" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Packing No.
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Lot #
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Count (Ne)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Unit
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Product Type
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    End Use
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Qty (kg)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((entry, idx) => (
                  <TableRow
                    key={String(entry.id)}
                    data-ocid={`reports.packing.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {entry.packingNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateFromNs(entry.packingDate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.lotNumber}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {countLabels?.get(entry.lotNumber) ??
                        String(entry.yarnCountNe)}
                    </TableCell>
                    <TableCell>
                      <UnitBadge unit={entry.spinningUnit as string} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {productTypeLabel(entry.productType as string)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {endUseLabel(entry.endUse as string)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {Number(entry.quantityKg).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {entry.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 5: Daily Dispatch Report (Unit-wise) ─────────────────────────────────

const ALL_DESTINATIONS = [
  { value: "weaving", label: "Weaving" },
  { value: "kolhapur", label: "Kolhapur" },
  { value: "ambala", label: "Ambala" },
  { value: "outside", label: "Outside" },
  { value: "amravati", label: "Amravati" },
  { value: "softWinding", label: "Soft Winding" },
  { value: "tfo", label: "TFO" },
];

function DailyDispatchReport({
  entries,
  isLoading,
  countLabels,
}: {
  entries: DispatchEntry[];
  isLoading: boolean;
  countLabels?: Map<string, string>;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [destFilter, setDestFilter] = useState<string>("all");
  const [dispatchLotSearch, setDispatchLotSearch] = useState<string>("");

  const rows = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();
    return entries.filter((e) => {
      const ts = Number(e.dispatchDate) / 1_000_000;
      if (ts < from || ts > to) return false;
      if (unitFilter !== "all") {
        const u = (e.spinningUnit as string).toLowerCase();
        if (unitFilter === "openend" && u !== "openend") return false;
        if (
          unitFilter === "ringSpinning" &&
          u !== "ringspinning" &&
          u !== "ringSpinning"
        )
          return false;
        if (unitFilter === "tfo" && u !== "tfo") return false;
        if (unitFilter === "outsideYarn" && u !== "outsideyarn") return false;
      }
      if (
        destFilter !== "all" &&
        (e.destination as string).toLowerCase() !== destFilter.toLowerCase()
      )
        return false;
      if (
        dispatchLotSearch.trim() &&
        !e.lotNumber
          .toLowerCase()
          .includes(dispatchLotSearch.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [entries, fromDate, toDate, unitFilter, destFilter, dispatchLotSearch]);

  const kpis = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.quantityKg), 0);
    const oeQty = rows
      .filter((r) => (r.spinningUnit as string).toLowerCase() === "openend")
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    const ringQty = rows
      .filter((r) => {
        const u = (r.spinningUnit as string).toLowerCase();
        return u === "ringspinning";
      })
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    const tfoQty = rows
      .filter((r) => (r.spinningUnit as string).toLowerCase() === "tfo")
      .reduce((s, r) => s + Number(r.quantityKg), 0);
    return { totalQty, oeQty, ringQty, tfoQty, count: rows.length };
  }, [rows]);

  function handleExport() {
    const headers = [
      "Dispatch No.",
      "Date",
      "Lot #",
      "Destination",
      "Count (Ne)",
      "Unit",
      "Product Type",
      "End Use",
      "Qty (kg)",
      "Remarks",
    ];
    const csvRows = rows.map((r) => [
      r.dispatchNumber,
      formatDateFromNs(r.dispatchDate),
      r.lotNumber,
      destinationLabel(r.destination as string),
      String(r.yarnCountNe),
      spinningUnitLabel(r.spinningUnit as string),
      productTypeLabel(r.productType as string),
      endUseLabel(r.endUse as string),
      Number(r.quantityKg),
      r.remarks || "—",
    ]);
    exportCsvRows(
      `daily-dispatch-${fromDate}-to-${toDate}.csv`,
      headers,
      csvRows,
    );
  }

  return (
    <div className="space-y-5">
      <FilterBar>
        <div className="space-y-1">
          <Label htmlFor="disp-from" className="text-xs">
            From
          </Label>
          <Input
            id="disp-from"
            type="date"
            data-ocid="reports.dispatch.input"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="disp-to" className="text-xs">
            To
          </Label>
          <Input
            id="disp-to"
            type="date"
            data-ocid="reports.dispatch.input"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="disp-unit" className="text-xs">
            Unit
          </Label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger
              id="disp-unit"
              data-ocid="reports.dispatch.select"
              className="h-8 text-sm w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="openend">OE Spinning</SelectItem>
              <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
              <SelectItem value="tfo">TFO</SelectItem>
              <SelectItem value="outsideYarn">Outside Yarn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="disp-dest" className="text-xs">
            Destination
          </Label>
          <Select value={destFilter} onValueChange={setDestFilter}>
            <SelectTrigger
              id="disp-dest"
              data-ocid="reports.dispatch.select"
              className="h-8 text-sm w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Destinations</SelectItem>
              {ALL_DESTINATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="disp-lot-search" className="text-xs">
            Lot No.
          </Label>
          <Input
            id="disp-lot-search"
            type="text"
            data-ocid="reports.dispatch.search_input"
            placeholder="Search lot..."
            value={dispatchLotSearch}
            onChange={(e) => setDispatchLotSearch(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.dispatch.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          ocid="reports.dispatch.card"
          label="Total Dispatched"
          value={`${kpis.totalQty.toLocaleString()} kg`}
          icon={<Send className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.dispatch.card"
          label="OE Spinning"
          value={`${kpis.oeQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.dispatch.card"
          label="Ring Spinning"
          value={`${kpis.ringQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.dispatch.card"
          label="TFO"
          value={`${kpis.tfoQty.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.dispatch.card"
          label="Total Entries"
          value={kpis.count}
          icon={<FileText className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : rows.length === 0 ? (
          <EmptyReport message="No dispatch entries in this date range" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Dispatch No.
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Lot #
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Destination
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Count (Ne)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Unit
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Product Type
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    End Use
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Qty (kg)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((entry, idx) => (
                  <TableRow
                    key={String(entry.id)}
                    data-ocid={`reports.dispatch.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {entry.dispatchNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateFromNs(entry.dispatchDate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.lotNumber}
                    </TableCell>
                    <TableCell>
                      <DestinationBadge
                        destination={entry.destination as string}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {countLabels?.get(entry.lotNumber) ??
                        String(entry.yarnCountNe)}
                    </TableCell>
                    <TableCell>
                      <UnitBadge unit={entry.spinningUnit as string} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {productTypeLabel(entry.productType as string)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {endUseLabel(entry.endUse as string)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {Number(entry.quantityKg).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[130px] truncate">
                      {entry.remarks || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 6: Yarn Stock Report (Unit-wise) ─────────────────────────────────────

interface YarnStockRow {
  lotNumber: string;
  yarnCountNe: string;
  spinningUnit: string;
  productType: string;
  endUse: string;
  totalPackedKg: number;
  totalDispatchedKg: number;
  availableKg: number;
}

function YarnStockReport({
  packingEntries,
  dispatchEntries,
  openingStockEntries,
  isLoading,
  countLabels,
}: {
  packingEntries: PackingEntry[];
  dispatchEntries: DispatchEntry[];
  openingStockEntries: YarnOpeningStockRecord[];
  isLoading: boolean;
  countLabels?: Map<string, string>;
}) {
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [lotSearch, setLotSearch] = useState<string>("");

  // Compute per-lot totals
  const rows = useMemo(() => {
    // Aggregate packing per lot
    const packMap = new Map<
      string,
      {
        totalPackedKg: number;
        yarnCountNe: string;
        spinningUnit: string;
        productType: string;
        endUse: string;
      }
    >();
    for (const p of packingEntries) {
      const key = p.lotNumber;
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          yarnCountNe: countLabels?.get(p.lotNumber) ?? String(p.yarnCountNe),
          spinningUnit: p.spinningUnit as string,
          productType: p.productType as string,
          endUse: p.endUse as string,
        });
      }
      const r = packMap.get(key)!;
      r.totalPackedKg += Number(p.quantityKg);
    }

    // Also include yarn opening stock entries as initial stock
    for (const os of openingStockEntries) {
      const key = os.lotNumber;
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          yarnCountNe: countLabels?.get(os.lotNumber) ?? String(os.yarnCountNe),
          spinningUnit: os.spinningUnit as string,
          productType: os.productType as string,
          endUse: os.endUse as string,
        });
      }
      const r = packMap.get(key)!;
      r.totalPackedKg += Number(os.weightKg);
    }

    // Aggregate dispatch per lot
    const dispatchMap = new Map<string, number>();
    for (const d of dispatchEntries) {
      dispatchMap.set(
        d.lotNumber,
        (dispatchMap.get(d.lotNumber) ?? 0) + Number(d.quantityKg),
      );
    }

    const result: YarnStockRow[] = [];
    for (const [lotNumber, pack] of packMap.entries()) {
      const totalDispatchedKg = dispatchMap.get(lotNumber) ?? 0;
      const availableKg = pack.totalPackedKg - totalDispatchedKg;
      // Show all lots with transactions, even if stock is 0
      result.push({
        lotNumber,
        yarnCountNe: pack.yarnCountNe,
        spinningUnit: pack.spinningUnit,
        productType: pack.productType,
        endUse: pack.endUse,
        totalPackedKg: pack.totalPackedKg,
        totalDispatchedKg,
        availableKg,
      });
    }

    return result.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
  }, [packingEntries, dispatchEntries, openingStockEntries, countLabels]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (unitFilter !== "all") {
        const u = r.spinningUnit.toLowerCase();
        if (unitFilter === "openend" && u !== "openend") return false;
        if (unitFilter === "ringSpinning" && u !== "ringspinning") return false;
        if (unitFilter === "tfo" && u !== "tfo") return false;
        if (unitFilter === "outsideYarn" && u !== "outsideyarn") return false;
      }
      if (
        lotSearch.trim() &&
        !r.lotNumber.toLowerCase().includes(lotSearch.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, unitFilter, lotSearch]);

  const kpis = useMemo(() => {
    const totalStock = filteredRows.reduce((s, r) => s + r.availableKg, 0);
    const oeStock = filteredRows
      .filter((r) => r.spinningUnit.toLowerCase() === "openend")
      .reduce((s, r) => s + r.availableKg, 0);
    const ringStock = filteredRows
      .filter((r) => r.spinningUnit.toLowerCase() === "ringspinning")
      .reduce((s, r) => s + r.availableKg, 0);
    const tfoStock = filteredRows
      .filter((r) => r.spinningUnit.toLowerCase() === "tfo")
      .reduce((s, r) => s + r.availableKg, 0);
    const outsideYarnStock = filteredRows
      .filter((r) => r.spinningUnit.toLowerCase() === "outsideyarn")
      .reduce((s, r) => s + r.availableKg, 0);
    return { totalStock, oeStock, ringStock, tfoStock, outsideYarnStock };
  }, [filteredRows]);

  function handleExport() {
    const headers = [
      "Lot #",
      "Count (Ne)",
      "Unit",
      "Product Type",
      "End Use",
      "Total Packed (kg)",
      "Total Dispatched (kg)",
      "Available (kg)",
    ];
    const csvRows = filteredRows.map((r) => [
      r.lotNumber,
      r.yarnCountNe,
      spinningUnitLabel(r.spinningUnit),
      productTypeLabel(r.productType),
      endUseLabel(r.endUse),
      r.totalPackedKg,
      r.totalDispatchedKg,
      r.availableKg,
    ]);
    exportCsvRows("yarn-stock-report.csv", headers, csvRows);
  }

  return (
    <div className="space-y-5">
      <FilterBar>
        <div className="space-y-1">
          <Label htmlFor="stock-unit" className="text-xs">
            Unit
          </Label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger
              id="stock-unit"
              data-ocid="reports.yarnstock.select"
              className="h-8 text-sm w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              <SelectItem value="openend">OE Spinning</SelectItem>
              <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
              <SelectItem value="tfo">TFO</SelectItem>
              <SelectItem value="outsideYarn">Outside Yarn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="stock-lot-search" className="text-xs">
            Search Lot Number
          </Label>
          <Input
            id="stock-lot-search"
            data-ocid="reports.yarnstock.search_input"
            placeholder="Type lot number..."
            value={lotSearch}
            onChange={(e) => setLotSearch(e.target.value)}
            className="h-8 text-sm w-48"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="reports.yarnstock.primary_button"
          className="gap-2 h-8 text-xs ml-auto"
          onClick={handleExport}
          disabled={filteredRows.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          ocid="reports.yarnstock.card"
          label="Total Yarn Stock"
          value={`${kpis.totalStock.toLocaleString()} kg`}
          icon={<Package className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.yarnstock.card"
          label="OE Spinning Stock"
          value={`${kpis.oeStock.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.yarnstock.card"
          label="Ring Spinning Stock"
          value={`${kpis.ringStock.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.yarnstock.card"
          label="TFO Stock"
          value={`${kpis.tfoStock.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
        <KpiCard
          ocid="reports.yarnstock.card"
          label="Outside Yarn Stock"
          value={`${kpis.outsideYarnStock.toLocaleString()} kg`}
          icon={<Layers className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingReport />
        ) : filteredRows.length === 0 ? (
          <EmptyReport message="No yarn stock available" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Lot #
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Count (Ne)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Unit
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    Product Type
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">
                    End Use
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Total Packed (kg)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Total Dispatched (kg)
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                    Available (kg)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow
                    key={row.lotNumber}
                    data-ocid={`reports.yarnstock.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono text-sm font-semibold">
                      {row.lotNumber}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {row.yarnCountNe}
                    </TableCell>
                    <TableCell>
                      <UnitBadge unit={row.spinningUnit} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {productTypeLabel(row.productType)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {endUseLabel(row.endUse)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {row.totalPackedKg.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-600 dark:text-amber-400">
                      {row.totalDispatchedKg.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                      {row.availableKg.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Outside Yarn Inward Report ───────────────────────────────────────────────

function OutsideYarnInwardReport({
  openingStockEntries,
  isLoading,
  countLabels,
}: {
  openingStockEntries: YarnOpeningStockRecord[];
  isLoading: boolean;
  countLabels: Map<string, string> | undefined;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lotSearch, setLotSearch] = useState("");

  const outsideEntries = openingStockEntries.filter(
    (e) => String(e.spinningUnit) === "outsideYarn",
  );

  const filtered = outsideEntries.filter((e) => {
    const d = new Date(Number(e.createdAt) / 1_000_000);
    if (fromDate) {
      const from = new Date(fromDate);
      if (d < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    if (
      lotSearch &&
      !e.lotNumber.toLowerCase().includes(lotSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const totalQty = filtered.reduce((a, e) => a + Number(e.weightKg), 0);

  return (
    <div className="space-y-4 pt-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lot Number</Label>
          <Input
            placeholder="Search lot..."
            value={lotSearch}
            onChange={(e) => setLotSearch(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        {(fromDate || toDate || lotSearch) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setLotSearch("");
            }}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Entries
          </p>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? "—" : filtered.length}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Total Qty (kg)
          </p>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? "—" : totalQty.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No outside yarn inward entries found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot Number
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Yarn Count (Ne)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Product Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  End Use
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Qty (kg)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow
                  key={String(entry.id)}
                  className="border-border/40 hover:bg-muted/40"
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(
                      Number(entry.createdAt) / 1_000_000,
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {entry.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {countLabels?.get(entry.lotNumber) ??
                      String(entry.yarnCountNe)}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {String(entry.productType) === "lt"
                      ? "LT"
                      : String(entry.productType).charAt(0).toUpperCase() +
                        String(entry.productType).slice(1)}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {String(entry.endUse) === "tfo"
                      ? "TFO"
                      : String(entry.endUse).charAt(0).toUpperCase() +
                        String(entry.endUse).slice(1)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {Number(entry.weightKg).toLocaleString()}
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

// ─── Issue vs Packing Summary Report ──────────────────────────────────────────

function IssueVsPackingSummaryReport({
  issues,
  packingEntries,
  isLoading,
}: {
  issues: MaterialIssue[];
  packingEntries: PackingEntry[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  // Filter issues by date
  const filteredIssues = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();
    return issues.filter((i) => {
      const ts = Number(i.issueDate) / 1_000_000;
      return ts >= from && ts <= to;
    });
  }, [issues, fromDate, toDate]);

  // Filter packing entries by date
  const filteredPacking = useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    const to = new Date(`${toDate}T23:59:59`).getTime();
    return packingEntries.filter((p) => {
      const ts = Number(p.packingDate) / 1_000_000;
      return ts >= from && ts <= to;
    });
  }, [packingEntries, fromDate, toDate]);

  // Grade-wise issue aggregation (group by materialName, which is the grade identifier in this app)
  const gradeRows = useMemo(() => {
    const map: Record<string, { oe: number; ring: number }> = {};
    for (const issue of filteredIssues) {
      const grade =
        (issue.materialName || "").trim() ||
        (issue.grade || "").trim() ||
        "Unknown";
      if (!map[grade]) map[grade] = { oe: 0, ring: 0 };
      const qty = Number(issue.issuedQty);
      const wh = (issue.warehouse as string).toLowerCase();
      if (wh === "oerawmaterial") map[grade].oe += qty;
      else if (wh === "ringrawmaterial") map[grade].ring += qty;
    }
    return Object.entries(map)
      .map(([grade, v]) => ({
        grade,
        oe: v.oe,
        ring: v.ring,
        total: v.oe + v.ring,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade));
  }, [filteredIssues]);

  // Totals for issues
  const totalOeIssued = gradeRows.reduce((s, r) => s + r.oe, 0);
  const totalRingIssued = gradeRows.reduce((s, r) => s + r.ring, 0);
  const totalIssued = totalOeIssued + totalRingIssued;

  // Yarn packed aggregation
  const totalOePacked = useMemo(
    () =>
      filteredPacking
        .filter((p) => (p.spinningUnit as string).toLowerCase() === "openend")
        .reduce((s, p) => s + Number(p.quantityKg), 0),
    [filteredPacking],
  );
  const totalRingPacked = useMemo(
    () =>
      filteredPacking
        .filter(
          (p) => (p.spinningUnit as string).toLowerCase() === "ringspinning",
        )
        .reduce((s, p) => s + Number(p.quantityKg), 0),
    [filteredPacking],
  );
  const totalPacked = totalOePacked + totalRingPacked;

  // Balance
  const oeBalance = totalOeIssued - totalOePacked;
  const ringBalance = totalRingIssued - totalRingPacked;
  const overallBalance = totalIssued - totalPacked;

  function fmt(n: number) {
    return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function balanceClass(n: number) {
    if (n > 0) return "text-green-600 font-semibold";
    if (n < 0) return "text-red-600 font-semibold";
    return "text-gray-700 font-semibold";
  }

  function handleExport() {
    const headers1 = [
      "Grade",
      "OE Warehouse (Kg)",
      "Ring Warehouse (Kg)",
      "Total Issued (Kg)",
    ];
    const rows1 = gradeRows.map((r) => [r.grade, r.oe, r.ring, r.total]);
    rows1.push(["TOTAL", totalOeIssued, totalRingIssued, totalIssued]);

    const headers2 = [
      "Unit",
      "Total Issued (Kg)",
      "Total Packed (Kg)",
      "Balance (Kg)",
    ];
    const rows2 = [
      ["OE Spinning", totalOeIssued, totalOePacked, oeBalance],
      ["Ring Spinning", totalRingIssued, totalRingPacked, ringBalance],
      ["Overall", totalIssued, totalPacked, overallBalance],
    ];

    const sep = [[""], [""]];
    exportCsvRows(
      `issue-vs-packing-summary-${fromDate}-to-${toDate}.csv`,
      headers1,
      [...rows1, ...sep, headers2 as (string | number)[], ...rows2],
    );
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) return <LoadingReport />;

  return (
    <div className="space-y-6" data-ocid="issue_packing_summary.section">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-4 bg-white border rounded-xl px-4 py-3 shadow-sm">
        <CalendarRange className="w-4 h-4 text-muted-foreground mt-auto mb-1" />
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From Date</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            data-ocid="issue_packing_summary.input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To Date</Label>
          <Input
            type="date"
            className="h-8 text-xs w-36"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            data-ocid="issue_packing_summary.input"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleExport}
            data-ocid="issue_packing_summary.secondary_button"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handlePrint}
            data-ocid="issue_packing_summary.primary_button"
          >
            <FileText className="w-3.5 h-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Section 1: Grade-wise Issue Summary */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50/60 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Grade-wise Raw Material Issue Summary
          </h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {gradeRows.length} grades
          </Badge>
        </div>
        {gradeRows.length === 0 ? (
          <EmptyReport message="No issue records found for the selected date range." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/40">
                <TableHead className="text-xs font-semibold text-slate-600">
                  Grade
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">
                  OE Warehouse (Kg)
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">
                  Ring Warehouse (Kg)
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">
                  Total Issued (Kg)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradeRows.map((row, i) => (
                <TableRow
                  key={row.grade}
                  className="hover:bg-slate-50/40"
                  data-ocid={`issue_packing_summary.row.item.${i + 1}`}
                >
                  <TableCell className="text-xs font-medium">
                    {row.grade}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {row.oe > 0 ? fmt(row.oe) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {row.ring > 0 ? fmt(row.ring) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold">
                    {fmt(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100/70">
                <td className="px-4 py-2 text-xs font-bold text-slate-700">
                  TOTAL
                </td>
                <td className="px-4 py-2 text-xs font-bold text-right tabular-nums text-slate-700">
                  {fmt(totalOeIssued)}
                </td>
                <td className="px-4 py-2 text-xs font-bold text-right tabular-nums text-slate-700">
                  {fmt(totalRingIssued)}
                </td>
                <td className="px-4 py-2 text-xs font-bold text-right tabular-nums text-slate-800">
                  {fmt(totalIssued)}
                </td>
              </tr>
            </tfoot>
          </Table>
        )}
      </div>

      {/* Section 2: Yarn Packed Summary */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50/60 flex items-center gap-2">
          <Package className="w-4 h-4 text-violet-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Yarn Packed Summary
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
          <div className="rounded-lg border bg-blue-50/60 px-5 py-4 flex flex-col gap-1">
            <p className="text-xs text-blue-700 font-medium">
              OE Spinning Packed
            </p>
            <p className="text-2xl font-bold text-blue-800 tabular-nums">
              {fmt(totalOePacked)}{" "}
              <span className="text-sm font-normal">Kg</span>
            </p>
          </div>
          <div className="rounded-lg border bg-violet-50/60 px-5 py-4 flex flex-col gap-1">
            <p className="text-xs text-violet-700 font-medium">
              Ring Spinning Packed
            </p>
            <p className="text-2xl font-bold text-violet-800 tabular-nums">
              {fmt(totalRingPacked)}{" "}
              <span className="text-sm font-normal">Kg</span>
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50/80 px-5 py-4 flex flex-col gap-1">
            <p className="text-xs text-slate-600 font-medium">
              Total Yarn Packed
            </p>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">
              {fmt(totalPacked)} <span className="text-sm font-normal">Kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Balance Summary */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50/60 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Balance Summary (Issued vs Packed)
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/40">
              <TableHead className="text-xs font-semibold text-slate-600">
                Unit
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">
                Total Issued (Kg)
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">
                Total Packed (Kg)
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-600 text-right">
                Balance (Kg)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              className="hover:bg-slate-50/40"
              data-ocid="issue_packing_summary.table"
            >
              <TableCell className="text-xs font-medium">
                OE Spinning (OE Warehouse)
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums">
                {fmt(totalOeIssued)}
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums">
                {fmt(totalOePacked)}
              </TableCell>
              <TableCell
                className={`text-xs text-right tabular-nums ${balanceClass(oeBalance)}`}
              >
                {fmt(oeBalance)}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-slate-50/40">
              <TableCell className="text-xs font-medium">
                Ring Spinning (Ring Warehouse)
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums">
                {fmt(totalRingIssued)}
              </TableCell>
              <TableCell className="text-xs text-right tabular-nums">
                {fmt(totalRingPacked)}
              </TableCell>
              <TableCell
                className={`text-xs text-right tabular-nums ${balanceClass(ringBalance)}`}
              >
                {fmt(ringBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100/70">
              <td className="px-4 py-2 text-xs font-bold text-slate-700">
                Overall
              </td>
              <td className="px-4 py-2 text-xs font-bold text-right tabular-nums text-slate-700">
                {fmt(totalIssued)}
              </td>
              <td className="px-4 py-2 text-xs font-bold text-right tabular-nums text-slate-700">
                {fmt(totalPacked)}
              </td>
              <td
                className={`px-4 py-2 text-xs text-right tabular-nums ${balanceClass(overallBalance)}`}
              >
                {fmt(overallBalance)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waste Summary Report
// ─────────────────────────────────────────────────────────────────────────────
function WasteSummaryReport({
  issues,
  isLoading,
}: {
  issues: MaterialIssue[];
  isLoading: boolean;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const wasteIssues = useMemo(() => {
    return issues.filter(
      (i) => (i.department || "").toLowerCase() === "waste production",
    );
  }, [issues]);

  const filtered = useMemo(() => {
    let result = wasteIssues;
    if (fromDate) {
      result = result.filter((i) => {
        const d =
          typeof i.issueDate === "bigint"
            ? new Date(Number(i.issueDate / 1_000_000n))
            : new Date(i.issueDate as string);
        return d >= new Date(fromDate);
      });
    }
    if (toDate) {
      result = result.filter((i) => {
        const d =
          typeof i.issueDate === "bigint"
            ? new Date(Number(i.issueDate / 1_000_000n))
            : new Date(i.issueDate as string);
        return d <= new Date(`${toDate}T23:59:59`);
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i.materialName || "").toLowerCase().includes(q) ||
          (i.warehouse || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [wasteIssues, fromDate, toDate, search]);

  const totalOE = useMemo(
    () =>
      filtered
        .filter((i) => (i.warehouse || "").toLowerCase().includes("oe"))
        .reduce((s, i) => s + Number(i.issuedQty), 0),
    [filtered],
  );
  const totalRing = useMemo(
    () =>
      filtered
        .filter((i) => (i.warehouse || "").toLowerCase().includes("ring"))
        .reduce((s, i) => s + Number(i.issuedQty), 0),
    [filtered],
  );
  const totalAll = useMemo(
    () => filtered.reduce((s, i) => s + Number(i.issuedQty), 0),
    [filtered],
  );

  function formatDate(val: unknown): string {
    if (!val) return "—";
    try {
      const d =
        typeof val === "bigint"
          ? new Date(Number((val as bigint) / 1_000_000n))
          : new Date(val as string);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(val);
    }
  }

  function exportCSV() {
    const rows = [
      ["Date", "Waste Type", "Warehouse", "Quantity (kg)", "Remarks"],
      ...filtered.map((i) => [
        formatDate(i.issueDate),
        i.materialName || "",
        i.warehouse || "",
        String(Number(i.issuedQty)),
        i.remarks || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "waste_summary.csv";
    a.click();
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
            <Recycle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Waste OE
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {totalOE.toFixed(2)} kg
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
            <Recycle className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Waste Ring
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {totalRing.toFixed(2)} kg
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <Recycle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Total Waste Overall
            </p>
            <p className="text-xl font-bold text-foreground font-mono">
              {totalAll.toFixed(2)} kg
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs w-36"
              data-ocid="waste.input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <Input
            placeholder="Search waste type or warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs w-52"
            data-ocid="waste.search_input"
          />
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5 text-xs h-8"
              data-ocid="waste.secondary_button"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8"
            >
              <FileText className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div
            className="p-8 text-center space-y-2"
            data-ocid="waste.empty_state"
          >
            <Recycle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">
              No waste entries found.
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-md mx-auto">
              To record waste, go to{" "}
              <span className="font-semibold">Material Issue</span>, select
              department{" "}
              <span className="font-semibold">"Waste Production"</span>, and
              choose the waste type as the Material Name.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">
                  Waste Type
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Warehouse
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Quantity (kg)
                </TableHead>
                <TableHead className="text-xs font-semibold">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((issue, idx) => (
                <TableRow
                  key={issue.id || idx}
                  className="text-xs"
                  data-ocid={`waste.item.${idx + 1}`}
                >
                  <TableCell>{formatDate(issue.issueDate)}</TableCell>
                  <TableCell className="font-medium">
                    {issue.materialName || "—"}
                  </TableCell>
                  <TableCell>{issue.warehouse || "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(issue.issuedQty).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {issue.remarks || "—"}
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

export default function Reports() {
  const { data: logs = [], isLoading: logsLoading } = useProductionLogs();
  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: inwardEntries = [], isLoading: inwardLoading } =
    useInwardEntries();
  const { data: purchaseOrders = [], isLoading: poLoading } =
    usePurchaseOrders();
  const { data: materialIssues = [], isLoading: issuesLoading } =
    useMaterialIssues();
  const { data: packingEntries = [], isLoading: packingLoading } =
    usePackingEntries();
  const { data: dispatchEntries = [], isLoading: dispatchLoading } =
    useDispatchEntries();
  const { data: yarnOpeningStock = [], isLoading: yarnOpeningLoading } =
    useYarnOpeningStock();
  const { data: countLabels } = useYarnCountLabels();
  // productionOrders not directly needed at page level but available if needed
  const { isLoading: ordersLoading } = useProductionOrders();

  const productionLoading = logsLoading || machinesLoading;
  const inwardReportLoading = inwardLoading || poLoading;
  const yarnStockLoading =
    packingLoading || dispatchLoading || ordersLoading || yarnOpeningLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground font-display">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Daily production, issue, inward, packing, dispatch, and yarn stock
          analytics
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="production" className="space-y-5">
        <div className="overflow-x-auto pb-0.5">
          <TabsList className="h-9 gap-1 bg-muted/60 w-max min-w-full">
            <TabsTrigger
              value="production"
              data-ocid="reports.production.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Daily Production
            </TabsTrigger>
            <TabsTrigger
              value="issue"
              data-ocid="reports.issue.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Daily Issue
            </TabsTrigger>
            <TabsTrigger
              value="inward"
              data-ocid="reports.inward.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <PackageOpen className="w-3.5 h-3.5" />
              Daily Inward
            </TabsTrigger>
            <TabsTrigger
              value="packing"
              data-ocid="reports.packing.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" />
              Daily Packing
            </TabsTrigger>
            <TabsTrigger
              value="dispatch"
              data-ocid="reports.dispatch.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              Daily Dispatch
            </TabsTrigger>
            <TabsTrigger
              value="yarnstock"
              data-ocid="reports.yarnstock.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              Yarn Stock
            </TabsTrigger>
            <TabsTrigger
              value="outsideyarninward"
              data-ocid="reports.outsideyarninward.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" />
              Outside Yarn Inward
            </TabsTrigger>
            <TabsTrigger
              value="issuepackingsummary"
              data-ocid="reports.issuepackingsummary.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Issue vs Packing Summary
            </TabsTrigger>
            <TabsTrigger
              value="waste"
              data-ocid="reports.waste.tab"
              className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
            >
              <Recycle className="w-3.5 h-3.5" />
              Waste Summary
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="production" className="mt-0">
          <DailyProductionReport
            logs={logs}
            machines={machines}
            isLoading={productionLoading}
          />
        </TabsContent>

        <TabsContent value="issue" className="mt-0">
          <DailyIssueReport issues={materialIssues} isLoading={issuesLoading} />
        </TabsContent>

        <TabsContent value="inward" className="mt-0">
          <DailyInwardReport
            entries={inwardEntries}
            purchaseOrders={purchaseOrders}
            isLoading={inwardReportLoading}
          />
        </TabsContent>

        <TabsContent value="packing" className="mt-0">
          <DailyPackingReport
            entries={packingEntries}
            isLoading={packingLoading}
            countLabels={countLabels}
          />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-0">
          <DailyDispatchReport
            entries={dispatchEntries}
            isLoading={dispatchLoading}
            countLabels={countLabels}
          />
        </TabsContent>

        <TabsContent value="yarnstock" className="mt-0">
          <YarnStockReport
            packingEntries={packingEntries}
            dispatchEntries={dispatchEntries}
            openingStockEntries={yarnOpeningStock}
            isLoading={yarnStockLoading}
            countLabels={countLabels}
          />
        </TabsContent>

        <TabsContent value="outsideyarninward" className="mt-0">
          <OutsideYarnInwardReport
            openingStockEntries={yarnOpeningStock}
            isLoading={yarnStockLoading}
            countLabels={countLabels}
          />
        </TabsContent>

        <TabsContent value="issuepackingsummary" className="mt-0">
          <IssueVsPackingSummaryReport
            issues={materialIssues}
            packingEntries={packingEntries}
            isLoading={issuesLoading || packingLoading}
          />
        </TabsContent>

        <TabsContent value="waste" className="mt-0">
          <WasteSummaryReport
            issues={materialIssues}
            isLoading={issuesLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
