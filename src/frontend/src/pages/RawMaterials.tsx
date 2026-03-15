import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FilterX, Package, Printer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useUserRole } from "../hooks/UserRoleContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteRawMaterial,
  useMaterialIssues,
  useRawMaterials,
} from "../hooks/useQueries";

function WarehouseBadge({ warehouse }: { warehouse: Warehouse }) {
  if ((warehouse as string) === "oeRawMaterial") {
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 font-medium">
        OE Raw Material
      </Badge>
    );
  }
  return (
    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 font-medium">
      Ring Raw Material
    </Badge>
  );
}

function formatMonthYear(timestampNs: bigint): string {
  const ms = Number(timestampNs) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getMonthYearKey(timestampNs: bigint): string {
  const ms = Number(timestampNs) / 1_000_000;
  const date = new Date(ms);
  // zero-padded month for sorting: "2026-01", "2026-03"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Stock summary entry grouped by material name + warehouse
interface GradeStockEntry {
  materialName: string;
  grade: string;
  warehouse: string;
  totalKg: number;
}

const PRINT_STYLE_ID = "rawmaterials-print-style";

function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* Hide everything by default */
      body > * { display: none !important; }

      /* Show only the print region */
      #rawmaterials-print-region,
      #rawmaterials-print-region * {
        display: revert !important;
        visibility: visible !important;
      }

      #rawmaterials-print-region {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        padding: 24px 32px !important;
        background: #fff !important;
        color: #111 !important;
        font-family: 'Outfit', sans-serif !important;
        font-size: 11pt !important;
        line-height: 1.5 !important;
      }

      /* Report header */
      .print-header {
        border-bottom: 2px solid #222 !important;
        margin-bottom: 18px !important;
        padding-bottom: 10px !important;
      }
      .print-company-name {
        font-size: 18pt !important;
        font-weight: 800 !important;
        letter-spacing: -0.02em !important;
        color: #111 !important;
      }
      .print-report-title {
        font-size: 13pt !important;
        font-weight: 600 !important;
        color: #333 !important;
        margin-top: 2px !important;
      }
      .print-meta {
        font-size: 9pt !important;
        color: #666 !important;
        margin-top: 4px !important;
      }
      .print-filter-note {
        font-size: 9pt !important;
        color: #555 !important;
        background: #f5f5f5 !important;
        border: 1px solid #ddd !important;
        border-radius: 3px !important;
        padding: 4px 8px !important;
        display: inline-block !important;
        margin-top: 4px !important;
      }

      /* Section headings */
      .print-section-title {
        font-size: 11pt !important;
        font-weight: 700 !important;
        color: #222 !important;
        margin: 16px 0 8px !important;
        padding-bottom: 4px !important;
        border-bottom: 1px solid #ccc !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
      }

      /* Stock summary tables */
      .print-summary-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-bottom: 8px !important;
        font-size: 10pt !important;
      }
      .print-summary-table th {
        background: #f0f0f0 !important;
        color: #333 !important;
        font-weight: 700 !important;
        padding: 5px 10px !important;
        border: 1px solid #ccc !important;
        text-align: left !important;
      }
      .print-summary-table td {
        padding: 5px 10px !important;
        border: 1px solid #ddd !important;
        color: #111 !important;
      }
      .print-summary-table td.zero-stock {
        color: #c00 !important;
        font-weight: 600 !important;
      }

      /* Warehouse label badges in print */
      .print-warehouse-oe {
        font-weight: 700 !important;
        color: #1a56db !important;
      }
      .print-warehouse-ring {
        font-weight: 700 !important;
        color: #7e3af2 !important;
      }

      /* Detail table */
      .print-detail-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 9.5pt !important;
        page-break-inside: auto !important;
      }
      .print-detail-table th {
        background: #222 !important;
        color: #fff !important;
        font-weight: 700 !important;
        padding: 6px 9px !important;
        border: 1px solid #333 !important;
        text-align: left !important;
        text-transform: uppercase !important;
        font-size: 8pt !important;
        letter-spacing: 0.05em !important;
      }
      .print-detail-table tr {
        page-break-inside: avoid !important;
      }
      .print-detail-table td {
        padding: 5px 9px !important;
        border: 1px solid #ddd !important;
        color: #111 !important;
        vertical-align: top !important;
      }
      .print-detail-table tr:nth-child(even) td {
        background: #fafafa !important;
      }
      .print-total-row td {
        border-top: 2px solid #444 !important;
        font-weight: 700 !important;
        background: #f0f0f0 !important;
      }

      /* Footer */
      .print-footer {
        margin-top: 20px !important;
        padding-top: 8px !important;
        border-top: 1px solid #ccc !important;
        font-size: 8.5pt !important;
        color: #888 !important;
        display: flex !important;
        justify-content: space-between !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function RawMaterials() {
  const { isAdmin } = useUserRole();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: materials = [], isLoading } = useRawMaterials();
  const { data: issues = [] } = useMaterialIssues();
  const deleteMutation = useDeleteRawMaterial();

  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  // Inject print styles on mount, clean up on unmount
  useEffect(() => {
    injectPrintStyles();
    return () => {
      const el = document.getElementById(PRINT_STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // Filter state
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Total issued qty per (materialName + warehouse) from material issues
  const issuedByMaterialWarehouse = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
        const key = `${issue.materialName}||${issue.warehouse as string}`;
        acc[key] = (acc[key] || 0) + Number(issue.issuedQty);
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [issues]);

  // Grade-wise stock summary: group by grade (material name) + warehouse
  // For both inward entries and opening stock entries, m.grade holds the material name
  // (e.g. "Cotton", "Comber Noil"). Never use lotNumber (which is "IW-2026-xxx" for inward).
  const gradeStockEntries = useMemo((): GradeStockEntry[] => {
    // Step 1: aggregate raw totals per (grade/material name + warehouse)
    const inwardMap: Record<
      string,
      {
        materialName: string;
        grade: string;
        warehouse: string;
        totalKg: number;
      }
    > = {};
    for (const m of materials) {
      const warehouse = m.warehouse as string;
      // m.grade always holds the material name for both inward entries and opening stock
      const displayName =
        m.grade && m.grade.trim() !== "" ? m.grade : m.lotNumber;
      const key = `${displayName}||${warehouse}`;
      if (!inwardMap[key]) {
        inwardMap[key] = {
          materialName: displayName,
          grade: m.grade,
          warehouse,
          totalKg: 0,
        };
      }
      inwardMap[key].totalKg += Number(m.weightKg);
    }

    // Step 2: subtract issued quantities
    // Issues track materialName + warehouse; materialName matches the grade field
    const entries: GradeStockEntry[] = Object.values(inwardMap).map((entry) => {
      const issueKey = `${entry.materialName}||${entry.warehouse}`;
      const issued = issuedByMaterialWarehouse[issueKey] || 0;
      return {
        ...entry,
        totalKg: Math.max(0, entry.totalKg - issued),
      };
    });

    return entries.sort((a, b) => {
      // Sort by warehouse then material name
      const wCompare = a.warehouse.localeCompare(b.warehouse);
      if (wCompare !== 0) return wCompare;
      return a.materialName.localeCompare(b.materialName);
    });
  }, [materials, issuedByMaterialWarehouse]);

  // Derive unique filter options from the data
  const supplierOptions = useMemo(() => {
    const unique = Array.from(
      new Set(materials.map((m) => m.supplier).filter(Boolean)),
    );
    return unique.sort();
  }, [materials]);

  const gradeOptions = useMemo(() => {
    const unique = Array.from(
      new Set(materials.map((m) => m.grade).filter(Boolean)),
    );
    return unique.sort();
  }, [materials]);

  const monthOptions = useMemo(() => {
    const seen = new Map<string, string>(); // key -> label
    for (const m of materials) {
      const key = getMonthYearKey(m.dateReceived);
      if (!seen.has(key)) {
        seen.set(key, formatMonthYear(m.dateReceived));
      }
    }
    // sort descending (most recent first)
    return Array.from(seen.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [materials]);

  // Apply filters
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (supplierFilter !== "all" && m.supplier !== supplierFilter)
        return false;
      if (gradeFilter !== "all" && m.grade !== gradeFilter) return false;
      if (warehouseFilter !== "all") {
        if (
          warehouseFilter === "oe" &&
          (m.warehouse as string) !== "oeRawMaterial"
        )
          return false;
        if (
          warehouseFilter === "ring" &&
          (m.warehouse as string) !== "ringRawMaterial"
        )
          return false;
      }
      if (monthFilter !== "all") {
        if (getMonthYearKey(m.dateReceived) !== monthFilter) return false;
      }
      return true;
    });
  }, [materials, supplierFilter, gradeFilter, warehouseFilter, monthFilter]);

  const isAnyFilterActive =
    supplierFilter !== "all" ||
    gradeFilter !== "all" ||
    warehouseFilter !== "all" ||
    monthFilter !== "all";

  function clearFilters() {
    setSupplierFilter("all");
    setGradeFilter("all");
    setWarehouseFilter("all");
    setMonthFilter("all");
  }

  // Build filter description string for print header
  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (supplierFilter !== "all") parts.push(`Supplier: ${supplierFilter}`);
    if (gradeFilter !== "all") parts.push(`Grade: ${gradeFilter}`);
    if (warehouseFilter !== "all")
      parts.push(
        `Warehouse: ${warehouseFilter === "oe" ? "OE Raw Material" : "Ring Raw Material"}`,
      );
    if (monthFilter !== "all") {
      const found = monthOptions.find((o) => o.key === monthFilter);
      if (found) parts.push(`Month: ${found.label}`);
    }
    return parts.join(" | ");
  }, [supplierFilter, gradeFilter, warehouseFilter, monthFilter, monthOptions]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Raw material deleted");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  // Totals for print
  const totalFilteredKg = useMemo(
    () => filteredMaterials.reduce((sum, m) => sum + Number(m.weightKg), 0),
    [filteredMaterials],
  );

  const printDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Raw Materials"
        description="Stock is automatically updated when inward entries are recorded against a purchase order"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            data-ocid="rawmaterials.print.button"
            className="gap-2 h-9 text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </Button>
        }
      />

      {/* Grade-wise Stock Summary */}
      {materials.length > 0 && (
        <div className="mb-4" data-ocid="rawmaterials.section">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Stock by Grade
            </span>
            <span className="text-xs text-muted-foreground/60">
              (after deducting issues)
            </span>
          </div>
          {/* OE Raw Material */}
          {gradeStockEntries.some((e) => e.warehouse === "oeRawMaterial") && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[11px] font-semibold px-2 py-0">
                  OE Raw Material
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {gradeStockEntries
                  .filter((e) => e.warehouse === "oeRawMaterial")
                  .map((entry) => (
                    <div
                      key={`${entry.materialName}||${entry.warehouse}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200/60 bg-blue-50/40 shadow-sm hover:bg-blue-50/80 transition-colors"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {entry.materialName}
                      </span>
                      <span className="text-muted-foreground/50 text-xs">
                        —
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          entry.totalKg === 0
                            ? "text-destructive"
                            : "text-blue-700"
                        }`}
                      >
                        {entry.totalKg.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* Ring Raw Material */}
          {gradeStockEntries.some((e) => e.warehouse === "ringRawMaterial") && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 text-[11px] font-semibold px-2 py-0">
                  Ring Raw Material
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {gradeStockEntries
                  .filter((e) => e.warehouse === "ringRawMaterial")
                  .map((entry) => (
                    <div
                      key={`${entry.materialName}||${entry.warehouse}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-200/60 bg-purple-50/40 shadow-sm hover:bg-purple-50/80 transition-colors"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {entry.materialName}
                      </span>
                      <span className="text-muted-foreground/50 text-xs">
                        —
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          entry.totalKg === 0
                            ? "text-destructive"
                            : "text-purple-700"
                        }`}
                      >
                        {entry.totalKg.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-lg border border-border/60 bg-card shadow-sm">
        {/* Supplier */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supplier
          </span>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger
              className="h-9 text-sm"
              data-ocid="rawmaterials.supplier.select"
            >
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {supplierOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Grade
          </span>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger
              className="h-9 text-sm"
              data-ocid="rawmaterials.grade.select"
            >
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {gradeOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warehouse */}
        <div className="flex flex-col gap-1 min-w-[175px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Warehouse
          </span>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger
              className="h-9 text-sm"
              data-ocid="rawmaterials.warehouse.select"
            >
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              <SelectItem value="oe">OE Raw Material</SelectItem>
              <SelectItem value="ring">Ring Raw Material</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Month */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Month
          </span>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger
              className="h-9 text-sm"
              data-ocid="rawmaterials.month.select"
            >
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthOptions.map(({ key, label }) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {isAnyFilterActive && (
          <div className="flex flex-col justify-end gap-1 self-end">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              data-ocid="rawmaterials.clear_filters.button"
              className="h-9 text-sm gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear Filters
            </Button>
          </div>
        )}

        {/* Result count */}
        {isAnyFilterActive && !isLoading && (
          <div className="ml-auto self-end pb-0.5">
            <span className="text-sm text-muted-foreground">
              {filteredMaterials.length} of {materials.length} result
              {materials.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            data-ocid="rawmaterials.empty_state"
            icon={<Package className="w-7 h-7" />}
            title={
              isAnyFilterActive
                ? "No results match your filters"
                : "No raw material stock yet"
            }
            description={
              isAnyFilterActive
                ? "Try adjusting or clearing your filters to see more records."
                : "Stock is automatically added when you record an inward entry."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Supplier
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Grade
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Weight (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Date Received
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Warehouse
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item, idx) => (
                <TableRow
                  key={String(item.id)}
                  data-ocid={`rawmaterials.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono-nums font-medium">
                    {item.lotNumber}
                  </TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.grade}</TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.weightKg).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(
                      Number(item.dateReceived) / 1_000_000,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <WarehouseBadge warehouse={item.warehouse} />
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`rawmaterials.delete_button.${idx + 1}`}
                        onClick={() => setDeleteId(item.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Raw Material"
        description="This will permanently delete this raw material record. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />

      {/* ── Hidden Print Region ── */}
      <div id="rawmaterials-print-region" style={{ display: "none" }}>
        {/* Report Header */}
        <div className="print-header">
          <div className="print-company-name">SpinMill Pro</div>
          <div className="print-report-title">Raw Material Stock Report</div>
          <div className="print-meta">Printed on: {printDate}</div>
          {isAnyFilterActive && activeFilterDescription && (
            <div className="print-filter-note">
              Filtered by: {activeFilterDescription}
            </div>
          )}
        </div>

        {/* Stock Summary by Grade */}
        {gradeStockEntries.length > 0 && (
          <>
            <div className="print-section-title">Current Stock by Grade</div>

            {/* OE Raw Material Summary */}
            {gradeStockEntries.some((e) => e.warehouse === "oeRawMaterial") && (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: "10pt",
                    color: "#1a56db",
                  }}
                >
                  OE Raw Material
                </div>
                <table className="print-summary-table">
                  <thead>
                    <tr>
                      <th>Material / Grade</th>
                      <th style={{ textAlign: "right" }}>Stock (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStockEntries
                      .filter((e) => e.warehouse === "oeRawMaterial")
                      .map((entry) => (
                        <tr key={`${entry.materialName}||oe`}>
                          <td>{entry.materialName}</td>
                          <td
                            className={
                              entry.totalKg === 0 ? "zero-stock" : undefined
                            }
                            style={{ textAlign: "right", fontWeight: 600 }}
                          >
                            {entry.totalKg.toLocaleString()} kg
                          </td>
                        </tr>
                      ))}
                    <tr className="print-total-row">
                      <td>Total OE Stock</td>
                      <td style={{ textAlign: "right" }}>
                        {gradeStockEntries
                          .filter((e) => e.warehouse === "oeRawMaterial")
                          .reduce((s, e) => s + e.totalKg, 0)
                          .toLocaleString()}{" "}
                        kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* Ring Raw Material Summary */}
            {gradeStockEntries.some(
              (e) => e.warehouse === "ringRawMaterial",
            ) && (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    marginTop: 14,
                    marginBottom: 6,
                    fontSize: "10pt",
                    color: "#7e3af2",
                  }}
                >
                  Ring Raw Material
                </div>
                <table className="print-summary-table">
                  <thead>
                    <tr>
                      <th>Material / Grade</th>
                      <th style={{ textAlign: "right" }}>Stock (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeStockEntries
                      .filter((e) => e.warehouse === "ringRawMaterial")
                      .map((entry) => (
                        <tr key={`${entry.materialName}||ring`}>
                          <td>{entry.materialName}</td>
                          <td
                            className={
                              entry.totalKg === 0 ? "zero-stock" : undefined
                            }
                            style={{ textAlign: "right", fontWeight: 600 }}
                          >
                            {entry.totalKg.toLocaleString()} kg
                          </td>
                        </tr>
                      ))}
                    <tr className="print-total-row">
                      <td>Total Ring Stock</td>
                      <td style={{ textAlign: "right" }}>
                        {gradeStockEntries
                          .filter((e) => e.warehouse === "ringRawMaterial")
                          .reduce((s, e) => s + e.totalKg, 0)
                          .toLocaleString()}{" "}
                        kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {/* Detailed Stock Table */}
        <div className="print-section-title" style={{ marginTop: 20 }}>
          Detailed Stock Records
          {isAnyFilterActive
            ? ` — ${filteredMaterials.length} of ${materials.length} records`
            : ` — ${materials.length} records`}
        </div>

        {filteredMaterials.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic", fontSize: "10pt" }}>
            No records match the current filters.
          </p>
        ) : (
          <table className="print-detail-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Lot #</th>
                <th>Supplier</th>
                <th>Grade / Material</th>
                <th style={{ textAlign: "right" }}>Weight (kg)</th>
                <th>Date Received</th>
                <th>Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((item, idx) => (
                <tr key={String(item.id)}>
                  <td style={{ color: "#888", fontSize: "8.5pt" }}>
                    {idx + 1}
                  </td>
                  <td style={{ fontFamily: "monospace" }}>{item.lotNumber}</td>
                  <td>{item.supplier}</td>
                  <td>{item.grade}</td>
                  <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                    {Number(item.weightKg).toLocaleString()}
                  </td>
                  <td>
                    {new Date(
                      Number(item.dateReceived) / 1_000_000,
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <span
                      className={
                        (item.warehouse as string) === "oeRawMaterial"
                          ? "print-warehouse-oe"
                          : "print-warehouse-ring"
                      }
                    >
                      {(item.warehouse as string) === "oeRawMaterial"
                        ? "OE Raw Material"
                        : "Ring Raw Material"}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="print-total-row">
                <td colSpan={4} style={{ textAlign: "right" }}>
                  Total Weight:
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                  {totalFilteredKg.toLocaleString()} kg
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        )}

        {/* Print Footer */}
        <div className="print-footer">
          <span>SpinMill Pro — Raw Material Stock Report</span>
          <span>
            © {new Date().getFullYear()} Built with caffeine.ai &nbsp;|&nbsp;
            {printDate}
          </span>
        </div>
      </div>
    </div>
  );
}
