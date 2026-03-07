import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  AlertCircle,
  FilterX,
  Info,
  Package2,
  RefreshCw,
  Weight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { usePackingEntries, useYarnOpeningStock } from "../hooks/useQueries";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatUnit(su: string): string {
  if (su === "openend") return "Openend";
  if (su === "ringSpinning") return "Ring Spinning";
  return su;
}

function formatProductType(pt: string): string {
  if (pt === "lt") return "LT";
  return pt.charAt(0).toUpperCase() + pt.slice(1);
}

function formatEndUse(eu: string): string {
  if (eu === "tfo") return "TFO";
  return eu.charAt(0).toUpperCase() + eu.slice(1);
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

interface AggregatedLot {
  key: string;
  lotNumber: string;
  yarnCountNe: number;
  spinningUnit: string;
  productType: string;
  endUse: string;
  totalPackedKg: number;
}

export default function YarnInventory() {
  const {
    data: packingEntries = [],
    isLoading,
    isError,
    refetch,
  } = usePackingEntries();
  const { data: openingStockEntries = [] } = useYarnOpeningStock();
  const isLoadingData = isLoading;

  const [filterUnit, setFilterUnit] = useState<string>("");
  const [filterProductType, setFilterProductType] = useState<string>("");
  const [filterEndUse, setFilterEndUse] = useState<string>("");

  // Aggregate packing entries + yarn opening stock by lotNumber + yarnCountNe + spinningUnit + productType + endUse
  const aggregatedLots = useMemo<AggregatedLot[]>(() => {
    const map = new Map<string, AggregatedLot>();

    // Process packing entries
    for (const entry of packingEntries) {
      const key = [
        entry.lotNumber,
        String(entry.yarnCountNe),
        String(entry.spinningUnit),
        String(entry.productType),
        String(entry.endUse),
      ].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.totalPackedKg += Number(entry.quantityKg);
      } else {
        map.set(key, {
          key,
          lotNumber: entry.lotNumber,
          yarnCountNe: Number(entry.yarnCountNe),
          spinningUnit: String(entry.spinningUnit),
          productType: String(entry.productType),
          endUse: String(entry.endUse),
          totalPackedKg: Number(entry.quantityKg),
        });
      }
    }

    // Also include yarn opening stock entries
    for (const entry of openingStockEntries) {
      const key = [
        entry.lotNumber,
        String(entry.yarnCountNe),
        String(entry.spinningUnit),
        String(entry.productType),
        String(entry.endUse),
      ].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.totalPackedKg += Number(entry.weightKg);
      } else {
        map.set(key, {
          key,
          lotNumber: entry.lotNumber,
          yarnCountNe: Number(entry.yarnCountNe),
          spinningUnit: String(entry.spinningUnit),
          productType: String(entry.productType),
          endUse: String(entry.endUse),
          totalPackedKg: Number(entry.weightKg),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.lotNumber.localeCompare(b.lotNumber),
    );
  }, [packingEntries, openingStockEntries]);

  const hasActiveFilters =
    filterUnit !== "" || filterProductType !== "" || filterEndUse !== "";

  const filteredLots = aggregatedLots.filter((lot) => {
    if (filterUnit !== "" && lot.spinningUnit !== filterUnit) return false;
    if (filterProductType !== "" && lot.productType !== filterProductType)
      return false;
    if (filterEndUse !== "" && lot.endUse !== filterEndUse) return false;
    return true;
  });

  const totalLots = filteredLots.length;
  const totalWeight = filteredLots.reduce(
    (sum, lot) => sum + lot.totalPackedKg,
    0,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yarn Inventory"
        description="Automatically built from packing entries — no manual entry required"
      />

      {/* Summary Cards */}
      {!isLoadingData && aggregatedLots.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Package2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{totalLots}</p>
                <p className="text-xs text-muted-foreground">Total Lots</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Weight className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {totalWeight.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Weight (kg)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 mb-4 text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <p className="text-sm">
          Yarn inventory is automatically built from packing entries and yarn
          opening stock. No manual entry required.
        </p>
      </div>

      {/* Error Banner */}
      {isError && (
        <div
          data-ocid="yarn.error_state"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mb-4"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">Failed to load yarn inventory data.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={filterUnit} onValueChange={setFilterUnit}>
          <SelectTrigger className="w-44" data-ocid="yarn.unit_filter">
            <SelectValue placeholder="Unit: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Units</SelectItem>
            <SelectItem value="openend">Openend</SelectItem>
            <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterProductType} onValueChange={setFilterProductType}>
          <SelectTrigger className="w-48" data-ocid="yarn.product_type_filter">
            <SelectValue placeholder="Product Type: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Product Types</SelectItem>
            <SelectItem value="carded">Carded</SelectItem>
            <SelectItem value="combed">Combed</SelectItem>
            <SelectItem value="polyester">Polyester</SelectItem>
            <SelectItem value="bamboo">Bamboo</SelectItem>
            <SelectItem value="viscose">Viscose</SelectItem>
            <SelectItem value="lt">LT</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEndUse} onValueChange={setFilterEndUse}>
          <SelectTrigger className="w-44" data-ocid="yarn.end_use_filter">
            <SelectValue placeholder="End Use: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All End Uses</SelectItem>
            <SelectItem value="warp">Warp</SelectItem>
            <SelectItem value="weft">Weft</SelectItem>
            <SelectItem value="pile">Pile</SelectItem>
            <SelectItem value="ground">Ground</SelectItem>
            <SelectItem value="tfo">TFO</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            data-ocid="yarn.clear_filters_button"
            onClick={() => {
              setFilterUnit("");
              setFilterProductType("");
              setFilterEndUse("");
            }}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <FilterX className="w-3.5 h-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoadingData ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : aggregatedLots.length === 0 ? (
          <EmptyState
            data-ocid="yarn.empty_state"
            icon={<Package2 className="w-7 h-7" />}
            title="No yarn inventory"
            description="Yarn inventory will appear here automatically as packing entries or yarn opening stock are recorded."
          />
        ) : filteredLots.length === 0 ? (
          <EmptyState
            data-ocid="yarn.empty_state"
            icon={<Package2 className="w-7 h-7" />}
            title="No matching records"
            description="No yarn lots match the selected filters. Try clearing some filters."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Lot #
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
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
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Total Packed (kg)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLots.map((lot, idx) => (
                <TableRow
                  key={lot.key}
                  data-ocid={`yarn.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono font-medium">
                    {lot.lotNumber}
                  </TableCell>
                  <TableCell className="font-mono">{lot.yarnCountNe}</TableCell>
                  <TableCell className="text-sm">
                    {formatUnit(lot.spinningUnit)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatProductType(lot.productType)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatEndUse(lot.endUse)}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {lot.totalPackedKg.toLocaleString()}
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
