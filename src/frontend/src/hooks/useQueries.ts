import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RawMaterial, RawMaterialStatus, Warehouse } from "../backend.d";
import type {
  BatchStage,
  DashboardStats,
  DispatchBalance,
  DispatchDestination,
  DispatchEntry,
  EndUse,
  FullBackendInterface,
  InventoryStatus,
  InwardEntry,
  Machine,
  MachineStatus,
  MachineType,
  MaterialIssue,
  OrderStatus,
  POBalance,
  PackingBalance,
  PackingEntry,
  ProcessStage,
  ProductType,
  ProductionLog,
  ProductionOrder,
  ProductionOrderBalance,
  PurchaseOrder,
  QualityTest,
  Shift,
  SpinningUnit,
  TwistDirection,
  WarehouseStock,
  YarnInventory,
  YarnOpeningStockRecord,
} from "../types";
import { normalizeRecord } from "../utils/candid";
import { useActor } from "./useActor";

// Helper to cast actor to full backend interface (backend.ts has a minimal stub
// but the deployed canister exposes all methods defined in backend.d.ts)
function fullActor(actor: unknown): FullBackendInterface {
  return actor as FullBackendInterface;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const { actor } = useActor();
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const result = await fullActor(actor).getDashboardStats();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

// ─── Raw Materials ────────────────────────────────────────────────────────────

export function useRawMaterials() {
  const { actor } = useActor();
  return useQuery<RawMaterial[]>({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllRawMaterials();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddRawMaterial() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      lotNumber: string;
      supplier: string;
      grade: string;
      weightKg: bigint;
      warehouse: Warehouse;
      inwardEntryId: bigint | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addRawMaterial(
        args.lotNumber,
        args.supplier,
        args.grade,
        args.weightKg,
        args.warehouse,
        args.inwardEntryId,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateRawMaterial() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      lotNumber: string;
      supplier: string;
      grade: string;
      weightKg: bigint;
      status: RawMaterialStatus;
      warehouse: Warehouse;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateRawMaterial(
        args.id,
        args.lotNumber,
        args.supplier,
        args.grade,
        args.weightKg,
        args.status,
        args.warehouse,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteRawMaterial() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteRawMaterial(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Production Orders ────────────────────────────────────────────────────────

export function useProductionOrders() {
  const { actor } = useActor();
  return useQuery<ProductionOrder[]>({
    queryKey: ["productionOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllProductionOrders();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useCreateProductionOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      orderNumber: string;
      lotNumber: string;
      productType: ProductType;
      spinningUnit: SpinningUnit;
      endUse: EndUse;
      yarnCountNe: bigint;
      twistDirection: TwistDirection;
      quantityKg: bigint;
      targetDate: bigint;
      status: OrderStatus;
      singleYarnLotNumber?: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).createProductionOrder(
        args.orderNumber,
        args.lotNumber,
        args.productType,
        args.spinningUnit,
        args.endUse,
        args.yarnCountNe,
        args.twistDirection,
        args.quantityKg,
        args.targetDate,
        args.status,
        args.singleYarnLotNumber ?? null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productionOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateProductionOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      orderNumber: string;
      lotNumber: string;
      productType: ProductType;
      spinningUnit: SpinningUnit;
      endUse: EndUse;
      yarnCountNe: bigint;
      twistDirection: TwistDirection;
      quantityKg: bigint;
      targetDate: bigint;
      status: OrderStatus;
      singleYarnLotNumber?: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateProductionOrder(
        args.id,
        args.orderNumber,
        args.lotNumber,
        args.productType,
        args.spinningUnit,
        args.endUse,
        args.yarnCountNe,
        args.twistDirection,
        args.quantityKg,
        args.targetDate,
        args.status,
        args.singleYarnLotNumber ?? null,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productionOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteProductionOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteProductionOrder(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productionOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Machines ─────────────────────────────────────────────────────────────────

export function useMachines() {
  const { actor } = useActor();
  return useQuery<Machine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllMachines();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useRegisterMachine() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      machineType: MachineType;
      machineNumber: string;
      status: MachineStatus;
      currentOrderId: bigint | null;
      runningCount: string | null;
      runningLotNumber: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).registerMachine(
        args.name,
        args.machineType,
        args.machineNumber,
        args.status,
        args.currentOrderId,
        args.runningCount,
        args.runningLotNumber,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateMachine() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      name: string;
      machineType: MachineType;
      machineNumber: string;
      status: MachineStatus;
      currentOrderId: bigint | null;
      runningCount: string | null;
      runningLotNumber: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateMachine(
        args.id,
        args.name,
        args.machineType,
        args.machineNumber,
        args.status,
        args.currentOrderId,
        args.runningCount,
        args.runningLotNumber,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteMachine() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteMachine(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Batch Stages ─────────────────────────────────────────────────────────────

export function useBatchStages() {
  const { actor } = useActor();
  return useQuery<BatchStage[]>({
    queryKey: ["batchStages"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllBatchStages();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddBatchStage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      batchId: bigint;
      stage: ProcessStage;
      weightInKg: bigint;
      weightOutKg: bigint;
      machineId: bigint;
      startTime: bigint;
      endTime: bigint;
      operatorNotes: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addBatchStage(
        args.batchId,
        args.stage,
        args.weightInKg,
        args.weightOutKg,
        args.machineId,
        args.startTime,
        args.endTime,
        args.operatorNotes,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchStages"] }),
  });
}

export function useUpdateBatchStage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      batchId: bigint;
      stage: ProcessStage;
      weightInKg: bigint;
      weightOutKg: bigint;
      machineId: bigint;
      startTime: bigint;
      endTime: bigint;
      operatorNotes: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateBatchStage(
        args.id,
        args.batchId,
        args.stage,
        args.weightInKg,
        args.weightOutKg,
        args.machineId,
        args.startTime,
        args.endTime,
        args.operatorNotes,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchStages"] }),
  });
}

export function useDeleteBatchStage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteBatchStage(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchStages"] }),
  });
}

// ─── Quality Tests ────────────────────────────────────────────────────────────

export function useQualityTests() {
  const { actor } = useActor();
  return useQuery<QualityTest[]>({
    queryKey: ["qualityTests"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllQualityTests();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddQualityTest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      batchId: bigint;
      csp: bigint;
      elongationPercent: bigint;
      evennessPercent: bigint;
      thinPlaces: bigint;
      thickPlaces: bigint;
      neps: bigint;
      hairinessIndex: bigint;
      pass: boolean;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addQualityTest(
        args.batchId,
        args.csp,
        args.elongationPercent,
        args.evennessPercent,
        args.thinPlaces,
        args.thickPlaces,
        args.neps,
        args.hairinessIndex,
        args.pass,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualityTests"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateQualityTest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      batchId: bigint;
      csp: bigint;
      elongationPercent: bigint;
      evennessPercent: bigint;
      thinPlaces: bigint;
      thickPlaces: bigint;
      neps: bigint;
      hairinessIndex: bigint;
      pass: boolean;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateQualityTest(
        args.id,
        args.batchId,
        args.csp,
        args.elongationPercent,
        args.evennessPercent,
        args.thinPlaces,
        args.thickPlaces,
        args.neps,
        args.hairinessIndex,
        args.pass,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualityTests"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteQualityTest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteQualityTest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualityTests"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Production Logs ──────────────────────────────────────────────────────────

export function useProductionLogs() {
  const { actor } = useActor();
  return useQuery<ProductionLog[]>({
    queryKey: ["productionLogs"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllProductionLogs();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddProductionLog() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      shift: Shift;
      date: bigint;
      machineId: bigint;
      quantityKg: bigint;
      efficiencyPercent: bigint;
      operatorName: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addProductionLog(
        args.shift,
        args.date,
        args.machineId,
        args.quantityKg,
        args.efficiencyPercent,
        args.operatorName,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionLogs"] }),
  });
}

export function useUpdateProductionLog() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      shift: Shift;
      date: bigint;
      machineId: bigint;
      quantityKg: bigint;
      efficiencyPercent: bigint;
      operatorName: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateProductionLog(
        args.id,
        args.shift,
        args.date,
        args.machineId,
        args.quantityKg,
        args.efficiencyPercent,
        args.operatorName,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionLogs"] }),
  });
}

export function useDeleteProductionLog() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteProductionLog(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionLogs"] }),
  });
}

// ─── Yarn Inventory ───────────────────────────────────────────────────────────

export function useYarnInventory() {
  const { actor } = useActor();
  return useQuery<YarnInventory[]>({
    queryKey: ["yarnInventory"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllYarnInventory();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddYarnInventory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      lotNumber: string;
      yarnCountNe: bigint;
      twistDirection: TwistDirection;
      quantityCones: bigint;
      weightKg: bigint;
      status: InventoryStatus;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addYarnInventory(
        args.lotNumber,
        args.yarnCountNe,
        args.twistDirection,
        args.quantityCones,
        args.weightKg,
        args.status,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateYarnInventory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      lotNumber: string;
      yarnCountNe: bigint;
      twistDirection: TwistDirection;
      quantityCones: bigint;
      weightKg: bigint;
      status: InventoryStatus;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateYarnInventory(
        args.id,
        args.lotNumber,
        args.yarnCountNe,
        args.twistDirection,
        args.quantityCones,
        args.weightKg,
        args.status,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteYarnInventory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteYarnInventory(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export function usePurchaseOrders() {
  const { actor } = useActor();
  return useQuery<PurchaseOrder[]>({
    queryKey: ["purchaseOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllPurchaseOrders();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useCreatePurchaseOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      poNumber: string;
      supplier: string;
      materialName: string;
      orderedQty: bigint;
      orderDate: bigint;
      expectedDeliveryDate: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).createPurchaseOrder(
        args.poNumber,
        args.supplier,
        args.materialName,
        args.orderedQty,
        args.orderDate,
        args.expectedDeliveryDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      qc.invalidateQueries({ queryKey: ["nextPONumber"] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      poNumber: string;
      supplier: string;
      materialName: string;
      orderedQty: bigint;
      orderDate: bigint;
      expectedDeliveryDate: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updatePurchaseOrder(
        args.id,
        args.poNumber,
        args.supplier,
        args.materialName,
        args.orderedQty,
        args.orderDate,
        args.expectedDeliveryDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deletePurchaseOrder(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Inward Entries ───────────────────────────────────────────────────────────

export function useInwardEntries() {
  const { actor } = useActor();
  return useQuery<InwardEntry[]>({
    queryKey: ["inwardEntries"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllInwardEntries();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddInwardEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      inwardNumber: string;
      purchaseOrderId: bigint;
      inwardDate: bigint;
      materialName: string;
      receivedQty: bigint;
      warehouse: Warehouse;
      vehicleNumber: string;
      remarks: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addInwardEntry(
        args.inwardNumber,
        args.purchaseOrderId,
        args.inwardDate,
        args.materialName,
        args.receivedQty,
        args.warehouse,
        args.vehicleNumber,
        args.remarks,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inwardEntries"] });
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      qc.invalidateQueries({ queryKey: ["nextInwardNumber"] });
    },
  });
}

export function useUpdateInwardEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      inwardDate: bigint;
      vehicleNumber: string;
      remarks: string;
      receivedQty: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateInwardEntry(
        args.id,
        args.inwardDate,
        args.vehicleNumber,
        args.remarks,
        args.receivedQty,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inwardEntries"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteInwardEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteInwardEntry(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inwardEntries"] });
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Warehouse Stock ──────────────────────────────────────────────────────────

export function useWarehouseStock() {
  const { actor } = useActor();
  return useQuery<WarehouseStock[]>({
    queryKey: ["warehouseStock"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllWarehouseStock();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

// ─── Auto-Number & PO Balance ─────────────────────────────────────────────────

export function useNextPONumber(enabled: boolean) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["nextPONumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).getNextPONumber();
    },
    enabled: !!actor && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useNextInwardNumber(enabled: boolean) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["nextInwardNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).getNextInwardNumber();
    },
    enabled: !!actor && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function usePOBalance(purchaseOrderId: bigint | null) {
  const { actor } = useActor();
  return useQuery<POBalance | null>({
    queryKey: ["poBalance", String(purchaseOrderId)],
    queryFn: async () => {
      if (!actor || purchaseOrderId === null) throw new Error("No actor or id");
      const result = await fullActor(actor).getPOBalance(purchaseOrderId);
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && purchaseOrderId !== null,
    retry: false,
    staleTime: 0,
  });
}

export function useProductionOrderBalance(
  yarnCountNe: bigint | null,
  lotNumber: string | null,
) {
  const { actor } = useActor();
  return useQuery<ProductionOrderBalance | null>({
    queryKey: [
      "productionOrderBalance",
      yarnCountNe !== null ? String(yarnCountNe) : null,
      lotNumber,
    ],
    queryFn: async () => {
      if (!actor || yarnCountNe === null || !lotNumber)
        throw new Error("No params");
      const result = await fullActor(actor).getProductionOrderBalance(
        yarnCountNe,
        lotNumber,
      );
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && yarnCountNe !== null && !!lotNumber,
    retry: false,
    staleTime: 0,
  });
}

// ─── Material Issues ──────────────────────────────────────────────────────────

export function useMaterialIssues() {
  const { actor } = useActor();
  return useQuery<MaterialIssue[]>({
    queryKey: ["materialIssues"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllMaterialIssues();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useCreateMaterialIssue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      department: string;
      warehouse: Warehouse;
      materialName: string;
      grade: string;
      issuedQty: bigint;
      remarks: string;
      issueDate: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).createMaterialIssue(
        args.department,
        args.warehouse,
        args.materialName,
        args.grade,
        args.issuedQty,
        args.remarks,
        args.issueDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materialIssues"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
      qc.invalidateQueries({ queryKey: ["nextIssueNumber"] });
    },
  });
}

export function useUpdateMaterialIssue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      department: string;
      warehouse: import("../types").Warehouse;
      materialName: string;
      grade: string;
      issuedQty: bigint;
      remarks: string;
      issueDate: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateMaterialIssue(
        args.id,
        args.department,
        args.warehouse,
        args.materialName,
        args.grade,
        args.issuedQty,
        args.remarks,
        args.issueDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materialIssues"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteMaterialIssue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteMaterialIssue(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materialIssues"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useNextIssueNumber(enabled: boolean) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["nextIssueNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).getNextIssueNumber();
    },
    enabled: !!actor && enabled,
    retry: false,
    staleTime: 0,
  });
}

// ─── Dispatch Entries ─────────────────────────────────────────────────────────

export function useDispatchEntries() {
  const { actor } = useActor();
  return useQuery<DispatchEntry[]>({
    queryKey: ["dispatchEntries"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllDispatchEntries();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useCreateDispatchEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      lotNumber: string;
      destination: DispatchDestination;
      quantityKg: bigint;
      dispatchDate: bigint;
      remarks: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).createDispatchEntry(
        args.lotNumber,
        args.destination,
        args.quantityKg,
        args.dispatchDate,
        args.remarks,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispatchEntries"] });
      qc.invalidateQueries({ queryKey: ["dispatchBalance"] });
      qc.invalidateQueries({ queryKey: ["nextDispatchNumber"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateDispatchEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      dispatchDate: bigint;
      destination: import("../types").DispatchDestination;
      quantityKg: bigint;
      remarks: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateDispatchEntry(
        args.id,
        args.dispatchDate,
        args.destination,
        args.quantityKg,
        args.remarks,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispatchEntries"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteDispatchEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteDispatchEntry(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispatchEntries"] });
      qc.invalidateQueries({ queryKey: ["dispatchBalance"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useNextDispatchNumber(enabled: boolean) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["nextDispatchNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).getNextDispatchNumber();
    },
    enabled: !!actor && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useDispatchBalance(lotNumber: string | null) {
  const { actor } = useActor();
  return useQuery<DispatchBalance | null>({
    queryKey: ["dispatchBalance", lotNumber],
    queryFn: async () => {
      if (!actor || !lotNumber) throw new Error("No params");
      const result = await fullActor(actor).getDispatchBalance(lotNumber);
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && !!lotNumber,
    retry: false,
    staleTime: 0,
  });
}

// ─── Packing Entries ──────────────────────────────────────────────────────────

export function usePackingEntries() {
  const { actor } = useActor();
  return useQuery<PackingEntry[]>({
    queryKey: ["packingEntries"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllPackingEntries();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useCreatePackingEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      lotNumber: string;
      quantityKg: bigint;
      remarks: string;
      packingDate: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).createPackingEntry(
        args.lotNumber,
        args.quantityKg,
        args.remarks,
        args.packingDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packingEntries"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["nextPackingNumber"] });
      qc.invalidateQueries({ queryKey: ["packingBalance"] });
    },
  });
}

export function useUpdatePackingEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      packingDate: bigint;
      quantityKg: bigint;
      remarks: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updatePackingEntry(
        args.id,
        args.packingDate,
        args.quantityKg,
        args.remarks,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packingEntries"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeletePackingEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deletePackingEntry(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packingEntries"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["packingBalance"] });
    },
  });
}

export function useNextPackingNumber(enabled: boolean) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["nextPackingNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).getNextPackingNumber();
    },
    enabled: !!actor && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function usePackingBalance(lotNumber: string | null) {
  const { actor } = useActor();
  return useQuery<PackingBalance | null>({
    queryKey: ["packingBalance", lotNumber],
    queryFn: async () => {
      if (!actor || !lotNumber) throw new Error("No params");
      const result = await fullActor(actor).getPackingBalance(lotNumber);
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && !!lotNumber,
    retry: false,
    staleTime: 0,
  });
}

// ─── Opening Stock ─────────────────────────────────────────────────────────────

export function useRawMaterialOpeningStock() {
  const { actor } = useActor();
  return useQuery<RawMaterial[]>({
    queryKey: ["rawMaterialOpeningStock"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllRawMaterialOpeningStock();
      return normalizeRecord(result);
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddRawMaterialOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      materialName: string;
      supplier: string;
      grade: string;
      weightKg: bigint;
      warehouse: Warehouse;
      date: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addRawMaterialOpeningStock(
        args.materialName,
        args.supplier,
        args.grade,
        args.weightKg,
        args.warehouse,
        args.date,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterialOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateRawMaterialOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      materialName: string;
      supplier: string;
      grade: string;
      weightKg: bigint;
      warehouse: import("../types").Warehouse;
      date: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateRawMaterialOpeningStock(
        args.id,
        args.materialName,
        args.supplier,
        args.grade,
        args.weightKg,
        args.warehouse,
        args.date,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterialOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteRawMaterialOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteRawMaterialOpeningStock(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterialOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["warehouseStock"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useYarnOpeningStock() {
  const { actor } = useActor();
  return useQuery<YarnOpeningStockRecord[]>({
    queryKey: ["yarnOpeningStock"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await fullActor(actor).getAllYarnOpeningStock();
      return normalizeRecord(result) as YarnOpeningStockRecord[];
    },
    enabled: !!actor,
    retry: 2,
  });
}

export function useAddYarnOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      lotNumber: string;
      yarnCountNe: bigint;
      spinningUnit: SpinningUnit;
      productType: ProductType;
      endUse: EndUse;
      weightKg: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).addYarnOpeningStock(
        args.lotNumber,
        args.yarnCountNe,
        args.spinningUnit,
        args.productType,
        args.endUse,
        args.weightKg,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateYarnOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: bigint;
      lotNumber: string;
      yarnCountNe: bigint;
      spinningUnit: import("../types").SpinningUnit;
      productType: import("../types").ProductType;
      endUse: import("../types").EndUse;
      weightKg: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).updateYarnOpeningStock(
        args.id,
        args.lotNumber,
        args.yarnCountNe,
        args.spinningUnit,
        args.productType,
        args.endUse,
        args.weightKg,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteYarnOpeningStock() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return fullActor(actor).deleteYarnOpeningStock(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnOpeningStock"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Yarn Count Labels ────────────────────────────────────────────────────────

export function useYarnCountLabels() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, string>>({
    queryKey: ["yarnCountLabels"],
    queryFn: async () => {
      if (!actor) return new Map();
      const entries = await actor.getAllYarnCountLabels();
      return new Map(entries);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30000,
  });
}

export function useSetYarnCountLabel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { lotNumber: string; countLabel: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.setYarnCountLabel(args.lotNumber, args.countLabel);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnCountLabels"] });
    },
  });
}
