import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BatchStage,
  DashboardStats,
  InventoryStatus,
  Machine,
  MachineStatus,
  MachineType,
  OrderStatus,
  ProcessStage,
  ProductType,
  ProductionLog,
  ProductionOrder,
  QualityTest,
  RawMaterial,
  RawMaterialStatus,
  Shift,
  TwistDirection,
  YarnInventory,
} from "../backend.d";
import { useActor } from "./useActor";

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const { actor, isFetching } = useActor();
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getDashboardStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Raw Materials ────────────────────────────────────────────────────────────

export function useRawMaterials() {
  const { actor, isFetching } = useActor();
  return useQuery<RawMaterial[]>({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRawMaterials();
    },
    enabled: !!actor && !isFetching,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addRawMaterial(
        args.lotNumber,
        args.supplier,
        args.grade,
        args.weightKg,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateRawMaterial(
        args.id,
        args.lotNumber,
        args.supplier,
        args.grade,
        args.weightKg,
        args.status,
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
      return actor.getAllProductionOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProductionOrder() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      orderNumber: string;
      productType: ProductType;
      yarnCountNe: bigint;
      twistDirection: TwistDirection;
      quantityKg: bigint;
      targetDate: bigint;
      status: OrderStatus;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createProductionOrder(
        args.orderNumber,
        args.productType,
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
      productType: ProductType;
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
        args.productType,
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
      return actor.getAllMachines();
    },
    enabled: !!actor && !isFetching,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.registerMachine(
        args.name,
        args.machineType,
        args.machineNumber,
        args.status,
        args.currentOrderId,
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
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateMachine(
        args.id,
        args.name,
        args.machineType,
        args.machineNumber,
        args.status,
        args.currentOrderId,
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
      return actor.getAllBatchStages();
    },
    enabled: !!actor && !isFetching,
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
      return actor.getAllQualityTests();
    },
    enabled: !!actor && !isFetching,
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
      return actor.getAllProductionLogs();
    },
    enabled: !!actor && !isFetching,
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
      return actor.getAllYarnInventory();
    },
    enabled: !!actor && !isFetching,
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
