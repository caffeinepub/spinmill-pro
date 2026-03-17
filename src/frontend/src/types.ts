/**
 * types.ts — Re-exports all types from backend.d.ts so that frontend code and
 * useQueries.ts use the SAME type definitions, eliminating enum conflicts.
 */

// ─── Re-export non-enum interface types ───────────────────────────────────────────────

export type {
  ApprovalStatus,
  BatchStage,
  DashboardStats,
  DispatchBalance,
  DispatchEntry,
  InventoryStatus,
  InwardEntry,
  Machine,
  MaterialIssue,
  None,
  Option,
  POBalance,
  PackingBalance,
  PackingEntry,
  ProductionLog,
  ProductionOrder,
  ProductionOrderBalance,
  PurchaseOrder,
  QualityTest,
  RawMaterial,
  Some,
  Time,
  UserApprovalInfo,
  UserProfile,
  UserRole,
  WarehouseStock,
  WarehouseTransfer,
  WasteEntry,
  WasteSale,
  YarnInventory,
  YarnOpeningStockRecord,
  backendInterface as FullBackendInterface,
} from "./backend.d";

// ─── Re-export enums as both type AND value ──────────────────────────────────────────────
export {
  DispatchDestination,
  EndUse,
  MachineStatus,
  MachineType,
  OrderStatus,
  ProcessStage,
  ProductType,
  PurchaseOrderStatus,
  RawMaterialStatus,
  Shift,
  SpinningUnit,
  TwistDirection,
  Warehouse,
  WasteWarehouse,
} from "./backend.d";
