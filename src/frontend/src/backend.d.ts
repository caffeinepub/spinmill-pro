import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface RawMaterial {
    id: bigint;
    status: RawMaterialStatus;
    supplier: string;
    lotNumber: string;
    weightKg: bigint;
    grade: string;
    dateReceived: Time;
}
export interface Machine {
    id: bigint;
    status: MachineStatus;
    name: string;
    currentOrderId?: bigint;
    machineNumber: string;
    machineType: MachineType;
}
export interface QualityTest {
    id: bigint;
    csp: bigint;
    evennessPercent: bigint;
    neps: bigint;
    pass: boolean;
    elongationPercent: bigint;
    thinPlaces: bigint;
    batchId: bigint;
    hairinessIndex: bigint;
    thickPlaces: bigint;
}
export interface ProductionLog {
    id: bigint;
    date: Time;
    operatorName: string;
    shift: Shift;
    efficiencyPercent: bigint;
    machineId: bigint;
    quantityKg: bigint;
}
export interface DashboardStats {
    totalRawMaterialWeightAvailable: bigint;
    recentQualityTestPassRate: bigint;
    totalYarnInventoryWeight: bigint;
    totalActiveOrders: bigint;
    totalMachinesRunning: bigint;
}
export interface YarnInventory {
    id: bigint;
    status: InventoryStatus;
    yarnCountNe: bigint;
    twistDirection: TwistDirection;
    quantityCones: bigint;
    lotNumber: string;
    weightKg: bigint;
}
export interface ProductionOrder {
    id: bigint;
    status: OrderStatus;
    yarnCountNe: bigint;
    twistDirection: TwistDirection;
    productType: ProductType;
    targetDate: Time;
    orderNumber: string;
    quantityKg: bigint;
}
export interface UserProfile {
    name: string;
    role: string;
    department: string;
}
export interface BatchStage {
    id: bigint;
    startTime: Time;
    operatorNotes: string;
    endTime: Time;
    weightInKg: bigint;
    weightOutKg: bigint;
    stage: ProcessStage;
    batchId: bigint;
    machineId: bigint;
}
export enum InventoryStatus {
    inStock = "inStock",
    dispatched = "dispatched"
}
export enum MachineStatus {
    idle = "idle",
    maintenance = "maintenance",
    running = "running"
}
export enum MachineType {
    ringFrame = "ringFrame",
    combing = "combing",
    blowroom = "blowroom",
    carding = "carding",
    roving = "roving",
    winding = "winding",
    drawing = "drawing"
}
export enum OrderStatus {
    cancelled = "cancelled",
    pending = "pending",
    completed = "completed",
    inProgress = "inProgress"
}
export enum ProcessStage {
    qualityCheck = "qualityCheck",
    combing = "combing",
    finished = "finished",
    blowroom = "blowroom",
    carding = "carding",
    roving = "roving",
    winding = "winding",
    ringSpinning = "ringSpinning",
    drawing = "drawing"
}
export enum ProductType {
    carded = "carded",
    combed = "combed"
}
export enum RawMaterialStatus {
    available = "available",
    consumed = "consumed",
    inUse = "inUse"
}
export enum Shift {
    morning = "morning",
    night = "night",
    afternoon = "afternoon"
}
export enum TwistDirection {
    s = "s",
    z = "z"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBatchStage(batchId: bigint, stage: ProcessStage, weightInKg: bigint, weightOutKg: bigint, machineId: bigint, startTime: Time, endTime: Time, operatorNotes: string): Promise<bigint>;
    addProductionLog(shift: Shift, date: Time, machineId: bigint, quantityKg: bigint, efficiencyPercent: bigint, operatorName: string): Promise<bigint>;
    addQualityTest(batchId: bigint, csp: bigint, elongationPercent: bigint, evennessPercent: bigint, thinPlaces: bigint, thickPlaces: bigint, neps: bigint, hairinessIndex: bigint, pass: boolean): Promise<bigint>;
    addRawMaterial(lotNumber: string, supplier: string, grade: string, weightKg: bigint): Promise<bigint>;
    addYarnInventory(lotNumber: string, yarnCountNe: bigint, twistDirection: TwistDirection, quantityCones: bigint, weightKg: bigint, status: InventoryStatus): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createProductionOrder(orderNumber: string, productType: ProductType, yarnCountNe: bigint, twistDirection: TwistDirection, quantityKg: bigint, targetDate: Time, status: OrderStatus): Promise<bigint>;
    deleteBatchStage(id: bigint): Promise<void>;
    deleteMachine(id: bigint): Promise<void>;
    deleteProductionLog(id: bigint): Promise<void>;
    deleteProductionOrder(id: bigint): Promise<void>;
    deleteQualityTest(id: bigint): Promise<void>;
    deleteRawMaterial(id: bigint): Promise<void>;
    deleteYarnInventory(id: bigint): Promise<void>;
    getAllBatchStages(): Promise<Array<BatchStage>>;
    getAllMachines(): Promise<Array<Machine>>;
    getAllProductionLogs(): Promise<Array<ProductionLog>>;
    getAllProductionOrders(): Promise<Array<ProductionOrder>>;
    getAllQualityTests(): Promise<Array<QualityTest>>;
    getAllRawMaterials(): Promise<Array<RawMaterial>>;
    getAllYarnInventory(): Promise<Array<YarnInventory>>;
    getBatchStage(id: bigint): Promise<BatchStage | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardStats(): Promise<DashboardStats>;
    getMachine(id: bigint): Promise<Machine | null>;
    getProductionLog(id: bigint): Promise<ProductionLog | null>;
    getProductionOrder(id: bigint): Promise<ProductionOrder | null>;
    getQualityTest(id: bigint): Promise<QualityTest | null>;
    getRawMaterial(id: bigint): Promise<RawMaterial | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getYarnInventory(id: bigint): Promise<YarnInventory | null>;
    isCallerAdmin(): Promise<boolean>;
    registerMachine(name: string, machineType: MachineType, machineNumber: string, status: MachineStatus, currentOrderId: bigint | null): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBatchStage(id: bigint, batchId: bigint, stage: ProcessStage, weightInKg: bigint, weightOutKg: bigint, machineId: bigint, startTime: Time, endTime: Time, operatorNotes: string): Promise<void>;
    updateMachine(id: bigint, name: string, machineType: MachineType, machineNumber: string, status: MachineStatus, currentOrderId: bigint | null): Promise<void>;
    updateProductionLog(id: bigint, shift: Shift, date: Time, machineId: bigint, quantityKg: bigint, efficiencyPercent: bigint, operatorName: string): Promise<void>;
    updateProductionOrder(id: bigint, orderNumber: string, productType: ProductType, yarnCountNe: bigint, twistDirection: TwistDirection, quantityKg: bigint, targetDate: Time, status: OrderStatus): Promise<void>;
    updateQualityTest(id: bigint, batchId: bigint, csp: bigint, elongationPercent: bigint, evennessPercent: bigint, thinPlaces: bigint, thickPlaces: bigint, neps: bigint, hairinessIndex: bigint, pass: boolean): Promise<void>;
    updateRawMaterial(id: bigint, lotNumber: string, supplier: string, grade: string, weightKg: bigint, status: RawMaterialStatus): Promise<void>;
    updateYarnInventory(id: bigint, lotNumber: string, yarnCountNe: bigint, twistDirection: TwistDirection, quantityCones: bigint, weightKg: bigint, status: InventoryStatus): Promise<void>;
}
