/**
 * Extended type definitions for SpinMill Pro backend.
 * These types supplement the auto-generated backend.d.ts with all additional
 * interfaces and enums required by the full canister API.
 */

import type {
  RawMaterial,
  RawMaterialStatus,
  Time,
  UserEntry,
  UserProfile,
  UserRole,
  Warehouse,
} from "./backend.d";

// Re-export base types that exist in backend.d
export type {
  RawMaterial,
  RawMaterialStatus,
  Time,
  UserEntry,
  UserProfile,
  UserRole,
  Warehouse,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalActiveOrders: bigint;
  totalMachinesRunning: bigint;
  totalRawMaterialWeightAvailable: bigint;
  totalYarnInventoryWeight: bigint;
  recentQualityTestPassRate: bigint;
  totalInwardTodayKg: bigint;
  oeWarehouseStockKg: bigint;
  ringWarehouseStockKg: bigint;
  totalDispatchedTodayKg: bigint;
}

// ─── Warehouse Stock ──────────────────────────────────────────────────────────

export interface WarehouseStock {
  warehouse: Warehouse;
  materialName: string;
  totalQty: bigint;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export enum PurchaseOrderStatus {
  open = "open",
  partiallyReceived = "partiallyReceived",
  closed = "closed",
}

export interface PurchaseOrder {
  id: bigint;
  poNumber: string;
  supplier: string;
  materialName: string;
  orderedQty: bigint;
  orderDate: Time;
  expectedDeliveryDate: Time;
  status: PurchaseOrderStatus;
}

export interface POBalance {
  orderedQty: bigint;
  receivedQty: bigint;
  balanceQty: bigint;
}

// ─── Inward Entry ─────────────────────────────────────────────────────────────

export interface InwardEntry {
  id: bigint;
  inwardNumber: string;
  purchaseOrderId: bigint;
  inwardDate: Time;
  materialName: string;
  receivedQty: bigint;
  warehouse: Warehouse;
  vehicleNumber: string;
  remarks: string;
}

// ─── Material Issue ───────────────────────────────────────────────────────────

export interface MaterialIssue {
  id: bigint;
  issueNumber: string;
  issueDate: Time;
  department: string;
  warehouse: Warehouse;
  materialName: string;
  grade: string;
  issuedQty: bigint;
  remarks: string;
}

// ─── Quality Test ─────────────────────────────────────────────────────────────

export interface QualityTest {
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
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export enum InventoryStatus {
  inStock = "inStock",
  dispatched = "dispatched",
}

export interface YarnInventory {
  id: bigint;
  lotNumber: string;
  yarnCountNe: bigint;
  twistDirection: TwistDirection;
  quantityCones: bigint;
  weightKg: bigint;
  status: InventoryStatus;
}

export interface YarnOpeningStockRecord {
  id: bigint;
  lotNumber: string;
  yarnCountNe: bigint;
  spinningUnit: SpinningUnit;
  productType: ProductType;
  endUse: EndUse;
  weightKg: bigint;
  createdAt: Time;
}

// ─── Production Orders ────────────────────────────────────────────────────────

export enum ProductType {
  carded = "carded",
  combed = "combed",
  polyester = "polyester",
  bamboo = "bamboo",
  viscose = "viscose",
  lt = "lt",
}

export enum SpinningUnit {
  openend = "openend",
  ringSpinning = "ringSpinning",
  tfo = "tfo",
  outsideYarn = "outsideYarn",
}

export enum EndUse {
  warp = "warp",
  weft = "weft",
  pile = "pile",
  ground = "ground",
  tfo = "tfo",
}

export enum TwistDirection {
  s = "s",
  z = "z",
}

export enum OrderStatus {
  pending = "pending",
  inProgress = "inProgress",
  completed = "completed",
  cancelled = "cancelled",
}

export interface ProductionOrder {
  id: bigint;
  orderNumber: string;
  lotNumber: string;
  productType: ProductType;
  spinningUnit: SpinningUnit;
  endUse: EndUse;
  yarnCountNe: bigint;
  twistDirection: TwistDirection;
  quantityKg: bigint;
  targetDate: Time;
  status: OrderStatus;
  singleYarnLotNumber?: string | null;
}

export interface ProductionOrderBalance {
  orderId: bigint;
  orderQty: bigint;
  producedQty: bigint;
  balanceQty: bigint;
  isFulfilled: boolean;
}

// ─── Machines ─────────────────────────────────────────────────────────────────

export enum MachineType {
  blowroom = "blowroom",
  carding = "carding",
  drawing = "drawing",
  combing = "combing",
  roving = "roving",
  ringFrame = "ringFrame",
  winding = "winding",
  autocoro = "autocoro",
  outsideYarn = "outsideYarn",
}

export enum MachineStatus {
  running = "running",
  idle = "idle",
  maintenance = "maintenance",
}

export interface Machine {
  id: bigint;
  name: string;
  machineType: MachineType;
  machineNumber: string;
  status: MachineStatus;
  currentOrderId?: bigint;
  runningCount?: bigint;
  runningLotNumber?: string;
  maintenanceStartTime?: bigint;
  totalMaintenanceDurationMins: bigint;
}

// ─── Batch Stages ─────────────────────────────────────────────────────────────

export enum ProcessStage {
  blowroom = "blowroom",
  carding = "carding",
  drawing = "drawing",
  combing = "combing",
  roving = "roving",
  ringSpinning = "ringSpinning",
  winding = "winding",
  qualityCheck = "qualityCheck",
  finished = "finished",
}

export interface BatchStage {
  id: bigint;
  batchId: bigint;
  stage: ProcessStage;
  weightInKg: bigint;
  weightOutKg: bigint;
  machineId: bigint;
  startTime: Time;
  endTime: Time;
  operatorNotes: string;
}

// ─── Production Logs ──────────────────────────────────────────────────────────

export enum Shift {
  morning = "morning",
  afternoon = "afternoon",
  night = "night",
}

export interface ProductionLog {
  id: bigint;
  shift: Shift;
  date: Time;
  machineId: bigint;
  quantityKg: bigint;
  efficiencyPercent: bigint;
  operatorName: string;
}

// ─── Packing ──────────────────────────────────────────────────────────────────

export interface PackingEntry {
  id: bigint;
  packingNumber: string;
  packingDate: Time;
  lotNumber: string;
  yarnCountNe: bigint;
  spinningUnit: SpinningUnit;
  productType: ProductType;
  endUse: EndUse;
  quantityKg: bigint;
  remarks: string;
}

export interface PackingBalance {
  lotNumber: string;
  yarnCountNe: bigint;
  spinningUnit: SpinningUnit;
  productType: ProductType;
  endUse: EndUse;
  availableKg: bigint;
  totalPackedKg: bigint;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export enum DispatchDestination {
  weaving = "weaving",
  kolhapur = "kolhapur",
  ambala = "ambala",
  outside = "outside",
  amravati = "amravati",
  softWinding = "softWinding",
  tfo = "tfo",
}

export interface DispatchEntry {
  id: bigint;
  dispatchNumber: string;
  dispatchDate: Time;
  lotNumber: string;
  destination: DispatchDestination;
  quantityKg: bigint;
  yarnCountNe: bigint;
  spinningUnit: SpinningUnit;
  productType: ProductType;
  endUse: EndUse;
  remarks: string;
}

export interface DispatchBalance {
  lotNumber: string;
  yarnCountNe: bigint;
  spinningUnit: SpinningUnit;
  productType: ProductType;
  endUse: EndUse;
  totalPackedKg: bigint;
  totalDispatchedKg: bigint;
  availableKg: bigint;
}

// ─── Full Backend Interface ───────────────────────────────────────────────────
// Extended interface that covers all canister methods beyond the minimal stub.

import type { Principal } from "@icp-sdk/core/principal";

export interface FullBackendInterface {
  addRawMaterial(
    lotNumber: string,
    supplier: string,
    grade: string,
    weightKg: bigint,
    warehouse: Warehouse,
    inwardEntryId: bigint | null,
  ): Promise<bigint>;
  addRawMaterialOpeningStock(
    materialName: string,
    supplier: string,
    grade: string,
    weightKg: bigint,
    warehouse: Warehouse,
    date: Time,
  ): Promise<bigint>;
  addYarnInventory(
    lotNumber: string,
    yarnCountNe: bigint,
    twistDirection: TwistDirection,
    quantityCones: bigint,
    weightKg: bigint,
    status: InventoryStatus,
  ): Promise<bigint>;
  addYarnOpeningStock(
    lotNumber: string,
    yarnCountNe: bigint,
    spinningUnit: SpinningUnit,
    productType: ProductType,
    endUse: EndUse,
    weightKg: bigint,
  ): Promise<bigint>;
  addBatchStage(
    batchId: bigint,
    stage: ProcessStage,
    weightInKg: bigint,
    weightOutKg: bigint,
    machineId: bigint,
    startTime: Time,
    endTime: Time,
    operatorNotes: string,
  ): Promise<bigint>;
  addProductionLog(
    shift: Shift,
    date: Time,
    machineId: bigint,
    quantityKg: bigint,
    efficiencyPercent: bigint,
    operatorName: string,
  ): Promise<bigint>;
  addQualityTest(
    batchId: bigint,
    csp: bigint,
    elongationPercent: bigint,
    evennessPercent: bigint,
    thinPlaces: bigint,
    thickPlaces: bigint,
    neps: bigint,
    hairinessIndex: bigint,
    pass: boolean,
  ): Promise<bigint>;
  addInwardEntry(
    inwardNumber: string,
    purchaseOrderId: bigint,
    inwardDate: Time,
    materialName: string,
    receivedQty: bigint,
    warehouse: Warehouse,
    vehicleNumber: string,
    remarks: string,
  ): Promise<bigint>;
  assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
  createDispatchEntry(
    lotNumber: string,
    destination: DispatchDestination,
    quantityKg: bigint,
    dispatchDate: Time,
    remarks: string,
  ): Promise<bigint>;
  createMaterialIssue(
    department: string,
    warehouse: Warehouse,
    materialName: string,
    grade: string,
    issuedQty: bigint,
    remarks: string,
    issueDate: bigint,
  ): Promise<bigint>;
  createPackingEntry(
    lotNumber: string,
    quantityKg: bigint,
    remarks: string,
    packingDate: Time,
  ): Promise<bigint>;
  createProductionOrder(
    orderNumber: string,
    lotNumber: string,
    productType: ProductType,
    spinningUnit: SpinningUnit,
    endUse: EndUse,
    yarnCountNe: bigint,
    twistDirection: TwistDirection,
    quantityKg: bigint,
    targetDate: Time,
    status: OrderStatus,
    singleYarnLotNumber: string | null,
  ): Promise<bigint>;
  createPurchaseOrder(
    poNumber: string,
    supplier: string,
    materialName: string,
    orderedQty: bigint,
    orderDate: Time,
    expectedDeliveryDate: Time,
  ): Promise<bigint>;
  deleteBatchStage(id: bigint): Promise<void>;
  deleteDispatchEntry(id: bigint): Promise<void>;
  deleteInwardEntry(id: bigint): Promise<void>;
  deleteMachine(id: bigint): Promise<void>;
  deleteMaterialIssue(id: bigint): Promise<void>;
  deletePackingEntry(id: bigint): Promise<void>;
  deleteProductionLog(id: bigint): Promise<void>;
  deleteProductionOrder(id: bigint): Promise<void>;
  deletePurchaseOrder(id: bigint): Promise<void>;
  deleteQualityTest(id: bigint): Promise<void>;
  deleteRawMaterial(id: bigint): Promise<void>;
  deleteRawMaterialOpeningStock(id: bigint): Promise<void>;
  deleteYarnInventory(id: bigint): Promise<void>;
  deleteYarnOpeningStock(id: bigint): Promise<void>;
  getAllBatchStages(): Promise<Array<BatchStage>>;
  getAllDispatchEntries(): Promise<Array<DispatchEntry>>;
  getAllInwardEntries(): Promise<Array<InwardEntry>>;
  getAllMachines(): Promise<Array<Machine>>;
  getAllMaterialIssues(): Promise<Array<MaterialIssue>>;
  getAllPackingEntries(): Promise<Array<PackingEntry>>;
  getAllProductionLogs(): Promise<Array<ProductionLog>>;
  getAllProductionOrders(): Promise<Array<ProductionOrder>>;
  getAllPurchaseOrders(): Promise<Array<PurchaseOrder>>;
  getAllQualityTests(): Promise<Array<QualityTest>>;
  getAllRawMaterialOpeningStock(): Promise<Array<RawMaterial>>;
  getAllRawMaterials(): Promise<Array<RawMaterial>>;
  getAllUsers(): Promise<Array<UserEntry>>;
  getAllWarehouseStock(): Promise<Array<WarehouseStock>>;
  getAllYarnInventory(): Promise<Array<YarnInventory>>;
  getAllYarnOpeningStock(): Promise<Array<YarnOpeningStockRecord>>;
  getCallerUserProfile(): Promise<UserProfile | null>;
  getCallerUserRole(): Promise<UserRole>;
  getDashboardStats(): Promise<DashboardStats>;
  getDispatchBalance(lotNumber: string): Promise<DispatchBalance | null>;
  getNextDispatchNumber(): Promise<string>;
  getNextInwardNumber(): Promise<string>;
  getNextIssueNumber(): Promise<string>;
  getNextPONumber(): Promise<string>;
  getNextPackingNumber(): Promise<string>;
  getNextProductionOrderNumber(): Promise<string>;
  getPOBalance(purchaseOrderId: bigint): Promise<POBalance | null>;
  getPackingBalance(lotNumber: string): Promise<PackingBalance | null>;
  getProductionOrderBalance(
    yarnCountNe: bigint,
    lotNumber: string,
  ): Promise<ProductionOrderBalance | null>;
  getUserProfile(user: Principal): Promise<UserProfile | null>;
  isCallerAdmin(): Promise<boolean>;
  setYarnCountLabel(lotNumber: string, countLabel: string): Promise<void>;
  getAllYarnCountLabels(): Promise<Array<[string, string]>>;
  registerMachine(
    name: string,
    machineType: MachineType,
    machineNumber: string,
    status: MachineStatus,
    currentOrderId: bigint | null,
    runningCount: bigint | null,
    runningLotNumber: string | null,
  ): Promise<bigint>;
  removeUser(user: Principal): Promise<void>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  updateBatchStage(
    id: bigint,
    batchId: bigint,
    stage: ProcessStage,
    weightInKg: bigint,
    weightOutKg: bigint,
    machineId: bigint,
    startTime: Time,
    endTime: Time,
    operatorNotes: string,
  ): Promise<void>;
  updateMachine(
    id: bigint,
    name: string,
    machineType: MachineType,
    machineNumber: string,
    status: MachineStatus,
    currentOrderId: bigint | null,
    runningCount: bigint | null,
    runningLotNumber: string | null,
  ): Promise<void>;
  updateProductionLog(
    id: bigint,
    shift: Shift,
    date: Time,
    machineId: bigint,
    quantityKg: bigint,
    efficiencyPercent: bigint,
    operatorName: string,
  ): Promise<void>;
  updateProductionOrder(
    id: bigint,
    orderNumber: string,
    lotNumber: string,
    productType: ProductType,
    spinningUnit: SpinningUnit,
    endUse: EndUse,
    yarnCountNe: bigint,
    twistDirection: TwistDirection,
    quantityKg: bigint,
    targetDate: Time,
    status: OrderStatus,
    singleYarnLotNumber: string | null,
  ): Promise<void>;
  updatePurchaseOrder(
    id: bigint,
    poNumber: string,
    supplier: string,
    materialName: string,
    orderedQty: bigint,
    orderDate: Time,
    expectedDeliveryDate: Time,
  ): Promise<void>;
  updateQualityTest(
    id: bigint,
    batchId: bigint,
    csp: bigint,
    elongationPercent: bigint,
    evennessPercent: bigint,
    thinPlaces: bigint,
    thickPlaces: bigint,
    neps: bigint,
    hairinessIndex: bigint,
    pass: boolean,
  ): Promise<void>;
  updateRawMaterial(
    id: bigint,
    lotNumber: string,
    supplier: string,
    grade: string,
    weightKg: bigint,
    status: RawMaterialStatus,
    warehouse: Warehouse,
  ): Promise<void>;
  updateUserRole(user: Principal, newRole: UserRole): Promise<void>;
  updateYarnInventory(
    id: bigint,
    lotNumber: string,
    yarnCountNe: bigint,
    twistDirection: TwistDirection,
    quantityCones: bigint,
    weightKg: bigint,
    status: InventoryStatus,
  ): Promise<void>;
}
