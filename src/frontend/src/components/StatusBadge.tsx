import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  InventoryStatus,
  MachineStatus,
  OrderStatus,
  ProcessStage,
  RawMaterialStatus,
} from "../backend.d";

type AnyStatus =
  | RawMaterialStatus
  | MachineStatus
  | OrderStatus
  | InventoryStatus
  | ProcessStage
  | "pass"
  | "fail"
  | string;

const statusConfig: Record<string, { label: string; cls: string }> = {
  // Machine
  running: { label: "Running", cls: "status-running" },
  idle: { label: "Idle", cls: "status-idle" },
  maintenance: { label: "Maintenance", cls: "status-maintenance" },

  // Raw material
  available: { label: "Available", cls: "status-running" },
  inUse: { label: "In Use", cls: "status-idle" },
  consumed: { label: "Consumed", cls: "status-maintenance" },

  // Orders
  pending: { label: "Pending", cls: "status-pending" },
  inProgress: { label: "In Progress", cls: "status-inprogress" },
  completed: { label: "Completed", cls: "status-completed" },
  cancelled: { label: "Cancelled", cls: "status-cancelled" },

  // Inventory
  inStock: { label: "In Stock", cls: "status-running" },
  dispatched: { label: "Dispatched", cls: "status-idle" },

  // Quality
  pass: { label: "Pass", cls: "status-running" },
  fail: { label: "Fail", cls: "status-maintenance" },

  // Process stages
  blowroom: { label: "Blow Room", cls: "status-pending" },
  carding: { label: "Carding", cls: "status-inprogress" },
  drawing: { label: "Drawing", cls: "status-inprogress" },
  combing: { label: "Combing", cls: "status-inprogress" },
  roving: { label: "Roving", cls: "status-inprogress" },
  ringSpinning: { label: "Ring Spinning", cls: "status-inprogress" },
  winding: { label: "Winding", cls: "status-idle" },
  qualityCheck: { label: "QC Check", cls: "status-idle" },
  finished: { label: "Finished", cls: "status-completed" },
};

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as string] ?? {
    label: String(status),
    cls: "status-cancelled",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium text-xs px-2 py-0.5",
        config.cls,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
