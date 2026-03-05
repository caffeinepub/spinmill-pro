import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BatchStage,
  DashboardStats,
  EndUse,
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
  PurchaseOrder,
  QualityTest,
  RawMaterial,
  RawMaterialStatus,
  Shift,
  SpinningUnit,
  TwistDirection,
  Warehouse,
  WarehouseStock,
  YarnInventory,
} from "../backend.d";
import { normalizeRecord } from "../utils/candid";
import { useActor } from "./useActor";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const { actor, isFetching } = useActor();
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const result = await actor.getDashboardStats();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// ─── Raw Materials ────────────────────────────────────────────────────────────

export function useRawMaterials() {
  const { actor, isFetching } = useActor();
  return useQuery<RawMaterial[]>({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllRawMaterials();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addRawMaterial(
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
      return actor.updateRawMaterial(
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
      return actor.deleteRawMaterial(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rawMaterials"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Production Orders ────────────────────────────────────────────────────────

export function useProductionOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<ProductionOrder[]>({
    queryKey: ["productionOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllProductionOrders();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createProductionOrder(
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProductionOrder(
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
      return actor.deleteProductionOrder(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productionOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Machines ─────────────────────────────────────────────────────────────────

export function useMachines() {
  const { actor, isFetching } = useActor();
  return useQuery<Machine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllMachines();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      runningCount: bigint | null;
      runningLotNumber: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.registerMachine(
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
      runningCount: bigint | null;
      runningLotNumber: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateMachine(
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
      return actor.deleteMachine(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Batch Stages ─────────────────────────────────────────────────────────────

export function useBatchStages() {
  const { actor, isFetching } = useActor();
  return useQuery<BatchStage[]>({
    queryKey: ["batchStages"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllBatchStages();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addBatchStage(
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
      return actor.updateBatchStage(
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
      return actor.deleteBatchStage(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batchStages"] }),
  });
}

// ─── Quality Tests ────────────────────────────────────────────────────────────

export function useQualityTests() {
  const { actor, isFetching } = useActor();
  return useQuery<QualityTest[]>({
    queryKey: ["qualityTests"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllQualityTests();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addQualityTest(
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
      return actor.updateQualityTest(
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
      return actor.deleteQualityTest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qualityTests"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Production Logs ──────────────────────────────────────────────────────────

export function useProductionLogs() {
  const { actor, isFetching } = useActor();
  return useQuery<ProductionLog[]>({
    queryKey: ["productionLogs"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllProductionLogs();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addProductionLog(
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
      return actor.updateProductionLog(
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
      return actor.deleteProductionLog(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productionLogs"] }),
  });
}

// ─── Yarn Inventory ───────────────────────────────────────────────────────────

export function useYarnInventory() {
  const { actor, isFetching } = useActor();
  return useQuery<YarnInventory[]>({
    queryKey: ["yarnInventory"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllYarnInventory();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addYarnInventory(
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
      return actor.updateYarnInventory(
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
      return actor.deleteYarnInventory(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export function usePurchaseOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<PurchaseOrder[]>({
    queryKey: ["purchaseOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllPurchaseOrders();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.createPurchaseOrder(
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
      return actor.updatePurchaseOrder(
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
      return actor.deletePurchaseOrder(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Inward Entries ───────────────────────────────────────────────────────────

export function useInwardEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<InwardEntry[]>({
    queryKey: ["inwardEntries"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllInwardEntries();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.addInwardEntry(
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

export function useDeleteInwardEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteInwardEntry(id);
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
  const { actor, isFetching } = useActor();
  return useQuery<WarehouseStock[]>({
    queryKey: ["warehouseStock"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllWarehouseStock();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// ─── Auto-Number & PO Balance ─────────────────────────────────────────────────

export function useNextPONumber(enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["nextPONumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getNextPONumber();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function useNextInwardNumber(enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["nextInwardNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getNextInwardNumber();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function usePOBalance(purchaseOrderId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<POBalance | null>({
    queryKey: ["poBalance", String(purchaseOrderId)],
    queryFn: async () => {
      if (!actor || purchaseOrderId === null) throw new Error("No actor or id");
      const result = await actor.getPOBalance(purchaseOrderId);
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && !isFetching && purchaseOrderId !== null,
    retry: false,
    staleTime: 0,
  });
}

export function useProductionOrderBalance(
  yarnCountNe: bigint | null,
  lotNumber: string | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend.d").ProductionOrderBalance | null>({
    queryKey: ["productionOrderBalance", String(yarnCountNe), lotNumber],
    queryFn: async () => {
      if (!actor || yarnCountNe === null || !lotNumber)
        throw new Error("No params");
      const result = await actor.getProductionOrderBalance(
        yarnCountNe,
        lotNumber,
      );
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && !isFetching && yarnCountNe !== null && !!lotNumber,
    retry: false,
    staleTime: 0,
  });
}

// ─── Material Issues ──────────────────────────────────────────────────────────

export function useMaterialIssues() {
  const { actor, isFetching } = useActor();
  return useQuery<MaterialIssue[]>({
    queryKey: ["materialIssues"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllMaterialIssues();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createMaterialIssue(
        args.department,
        args.warehouse,
        args.materialName,
        args.grade,
        args.issuedQty,
        args.remarks,
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

export function useDeleteMaterialIssue() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteMaterialIssue(id);
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
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["nextIssueNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getNextIssueNumber();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
    staleTime: 0,
  });
}

// ─── Packing Entries ──────────────────────────────────────────────────────────

export function usePackingEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<PackingEntry[]>({
    queryKey: ["packingEntries"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllPackingEntries();
      return normalizeRecord(result);
    },
    enabled: !!actor && !isFetching,
    retry: false,
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
      return actor.createPackingEntry(
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

export function useDeletePackingEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePackingEntry(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packingEntries"] });
      qc.invalidateQueries({ queryKey: ["yarnInventory"] });
      qc.invalidateQueries({ queryKey: ["packingBalance"] });
    },
  });
}

export function useNextPackingNumber(enabled: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["nextPackingNumber"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getNextPackingNumber();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: false,
    staleTime: 0,
  });
}

export function usePackingBalance(lotNumber: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<PackingBalance | null>({
    queryKey: ["packingBalance", lotNumber],
    queryFn: async () => {
      if (!actor || !lotNumber) throw new Error("No params");
      const result = await actor.getPackingBalance(lotNumber);
      return result ? normalizeRecord(result) : null;
    },
    enabled: !!actor && !isFetching && !!lotNumber,
    retry: false,
    staleTime: 0,
  });
}
