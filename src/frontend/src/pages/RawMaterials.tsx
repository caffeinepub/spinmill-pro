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
import { FilterX, Package, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Warehouse } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useDeleteRawMaterial, useRawMaterials } from "../hooks/useQueries";

function WarehouseBadge({ warehouse }: { warehouse: Warehouse }) {
  if (warehouse === Warehouse.oeRawMaterial) {
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

export default function RawMaterials() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: materials = [], isLoading } = useRawMaterials();
  const deleteMutation = useDeleteRawMaterial();

  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  // Filter state
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

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
        if (warehouseFilter === "oe" && m.warehouse !== Warehouse.oeRawMaterial)
          return false;
        if (
          warehouseFilter === "ring" &&
          m.warehouse !== Warehouse.ringRawMaterial
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Raw Materials"
        description="Stock is automatically updated when inward entries are recorded against a purchase order"
      />

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
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`rawmaterials.delete_button.${idx + 1}`}
                      onClick={() => setDeleteId(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
    </div>
  );
}
