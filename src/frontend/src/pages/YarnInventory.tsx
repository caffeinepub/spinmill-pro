import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Boxes, Info, Package2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InventoryStatus } from "../backend.d";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useDeleteYarnInventory, useYarnInventory } from "../hooks/useQueries";

export default function YarnInventory() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { data: inventory = [], isLoading } = useYarnInventory();
  const deleteMutation = useDeleteYarnInventory();

  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  const totalWeight = inventory.reduce((sum, i) => sum + Number(i.weightKg), 0);
  const inStockCount = inventory.filter(
    (i) => i.status === InventoryStatus.inStock,
  ).length;
  const totalCones = inventory.reduce(
    (sum, i) => sum + Number(i.quantityCones),
    0,
  );

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
        <div className="grid grid-cols-3 gap-4 mb-6">
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
              <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {totalCones.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Cones</p>
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
                  Twist
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Cones
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
              {inventory.map((item, idx) => (
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
                  <TableCell className="uppercase font-mono-nums font-medium">
                    {item.twistDirection}-Twist
                  </TableCell>
                  <TableCell className="font-mono-nums">
                    {Number(item.quantityCones).toLocaleString()}
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
              ))}
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
