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
import { FilterX, Info, Package2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { EndUse, ProductType, SpinningUnit } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useDeleteYarnInventory,
  useProductionOrders,
  useYarnInventory,
} from "../hooks/useQueries";

function getUnit(su: SpinningUnit): string {
  return su === "openend" ? "Openend" : "Ring Spinning";
}

function getProductType(pt: ProductType): string {
  return pt === "lt"
    ? "LT"
    : (pt as string).charAt(0).toUpperCase() + (pt as string).slice(1);
}

function getEndUse(eu: EndUse): string {
  return eu === "tfo"
    ? "TFO"
    : (eu as string).charAt(0).toUpperCase() + (eu as string).slice(1);
}

export default function YarnInventory() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: inventory = [], isLoading } = useYarnInventory();
  const { data: productionOrders = [] } = useProductionOrders();
  const deleteMutation = useDeleteYarnInventory();

  const [deleteId, setDeleteId] = useState<bigint | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>("");
  const [filterProductType, setFilterProductType] = useState<string>("");
  const [filterEndUse, setFilterEndUse] = useState<string>("");

  function matchOrder(lotNumber: string, yarnCountNe: bigint) {
    return (
      productionOrders.find(
        (o) =>
          o.lotNumber === lotNumber &&
          Number(o.yarnCountNe) === Number(yarnCountNe),
      ) ?? null
    );
  }

  const hasActiveFilters =
    filterUnit !== "" || filterProductType !== "" || filterEndUse !== "";

  const filteredInventory = inventory.filter((item) => {
    if (!hasActiveFilters) return true;
    const order = matchOrder(item.lotNumber, item.yarnCountNe);
    if (!order) return false;
    if (filterUnit !== "" && order.spinningUnit !== filterUnit) return false;
    if (filterProductType !== "" && order.productType !== filterProductType)
      return false;
    if (filterEndUse !== "" && order.endUse !== filterEndUse) return false;
    return true;
  });

  const totalWeight = inventory.reduce((sum, i) => sum + Number(i.weightKg), 0);
  const inStockCount = inventory.filter((i) => i.status === "inStock").length;

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Yarn lot removed");
    } catch {
      toast.error(isLoggedIn ? "Delete failed" : "Please sign in to save data");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yarn Inventory"
        description="Finished yarn stock auto-populated from production logs"
      />

      {/* Summary Cards */}
      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Package2 className="w-5 h-5 text-primary" />
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
          <Card className="border-border/60 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Package2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {inStockCount}
                </p>
                <p className="text-xs text-muted-foreground">Lots In Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 mb-4 text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <p className="text-sm">
          Yarn stock is automatically updated when production logs are added. No
          manual entry is required.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={filterUnit} onValueChange={(val) => setFilterUnit(val)}>
          <SelectTrigger className="w-44" data-ocid="yarn.unit_filter">
            <SelectValue placeholder="Unit: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Units</SelectItem>
            <SelectItem value="openend">Openend</SelectItem>
            <SelectItem value="ringSpinning">Ring Spinning</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterProductType}
          onValueChange={(val) => setFilterProductType(val)}
        >
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

        <Select
          value={filterEndUse}
          onValueChange={(val) => setFilterEndUse(val)}
        >
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
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            data-ocid="yarn.empty_state"
            icon={<Package2 className="w-7 h-7" />}
            title="No yarn inventory"
            description="Yarn inventory will appear here automatically as production logs are recorded."
          />
        ) : filteredInventory.length === 0 ? (
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
                  Weight (kg)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item, idx) => {
                const order = matchOrder(item.lotNumber, item.yarnCountNe);
                return (
                  <TableRow
                    key={String(item.id)}
                    data-ocid={`yarn.item.${idx + 1}`}
                    className="border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono-nums font-medium">
                      {item.lotNumber}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(item.yarnCountNe)}
                    </TableCell>
                    <TableCell>
                      {order ? (
                        <span className="text-sm">
                          {getUnit(order.spinningUnit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order ? (
                        <span className="text-sm">
                          {getProductType(order.productType)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order ? (
                        <span className="text-sm">
                          {getEndUse(order.endUse)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono-nums">
                      {Number(item.weightKg).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`yarn.delete_button.${idx + 1}`}
                        onClick={() => setDeleteId(item.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Yarn Lot"
        description="This will permanently remove this yarn lot from inventory."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
