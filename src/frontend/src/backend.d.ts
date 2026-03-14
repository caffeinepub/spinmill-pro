import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InwardEntry {
    id: bigint;
    receivedQty: bigint;
    inwardDate: Time;
    inwardNumber: string;
    vehicleNumber: string;
    purchaseOrderId: bigint;
    warehouse: Warehouse;
    materialName: string;
    remarks: string;
}
export interface PackingEntry {
    id: bigint;
    yarnCountNe: bigint;
    packingDate: Time;
    packingNumber: string;
    productType: ProductType;
    lotNumber: string;
    spinningUnit: SpinningUnit;
    remarks: string;
    quantityKg: bigint;
    endUse: EndUse;
}
export type Time = bigint;
export interface ProductionOrderBalance {
    isFulfilled: boolean;
    orderId: bigint;
    balanceQty: bigint;
    orderQty: bigint;
    producedQty: bigint;
}
export interface DispatchEntry {
    id: bigint;
    destination: DispatchDestination;
    yarnCountNe: bigint;
    dispatchDate: Time;
    productType: ProductType;
    lotNumber: string;
    spinningUnit: SpinningUnit;
    dispatchNumber: string;
    remarks: string;
    quantityKg: bigint;
    endUse: EndUse;
}
export interface PackingBalance {
    yarnCountNe: bigint;
    productType: ProductType;
    totalPackedKg: bigint;
    lotNumber: string;
    spinningUnit: SpinningUnit;
    availableKg: bigint;
    endUse: EndUse;
}
export interface PurchaseOrder {
    id: bigint;
    status: PurchaseOrderStatus;
    orderedQty: bigint;
    expectedDeliveryDate: Time;
    supplier: string;
    orderDate: Time;
    materialName: string;
    poNumber: string;
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
export interface MaterialIssue {
    id: bigint;
    issueDate: Time;
    issuedQty: bigint;
    issueNumber: string;
    grade: string;
    department: string;
    warehouse: Warehouse;
    materialName: string;
    remarks: string;
}
export interface RawMaterial {
    id: bigint;
    status: RawMaterialStatus;
    inwardEntryId?: bigint;
    supplier: string;
    lotNumber: string;
    weightKg: bigint;
    grade: string;
    dateReceived: Time;
    warehouse: Warehouse;
}
export interface WarehouseStock {
    totalQty: bigint;
    warehouse: Warehouse;
    materialName: string;
}
export interface POBalance {
    receivedQty: bigint;
    orderedQty: bigint;
    balanceQty: bigint;
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
export interface YarnOpeningStockRecord {
    id: bigint;
    yarnCountNe: bigint;
    createdAt: Time;
    productType: ProductType;
    lotNumber: string;
    weightKg: bigint;
    spinningUnit: SpinningUnit;
    endUse: EndUse;
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
export interface Machine {
    id: bigint;
    status: MachineStatus;
    maintenanceStartTime?: Time;
    runningLotNumber?: string;
    name: string;
    currentOrderId?: bigint;
    totalMaintenanceDurationMins: bigint;
    runningCount?: bigint;
    machineNumber: string;
    machineType: MachineType;
}
export interface DashboardStats {
    totalRawMaterialWeightAvailable: bigint;
    ringWarehouseStockKg: bigint;
    recentQualityTestPassRate: bigint;
    totalDispatchedTodayKg: bigint;
    totalYarnInventoryWeight: bigint;
    oeWarehouseStockKg: bigint;
    totalActiveOrders: bigint;
    totalMachinesRunning: bigint;
    totalInwardTodayKg: bigint;
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
export interface UserEntry {
    principal: Principal;
    role: UserRole;
}
export interface ProductionOrder {
    id: bigint;
    status: OrderStatus;
    yarnCountNe: bigint;
    twistDirection: TwistDirection;
    productType: ProductType;
    lotNumber: string;
    spinningUnit: SpinningUnit;
    targetDate: Time;
    orderNumber: string;
    quantityKg: bigint;
    endUse: EndUse;
    singleYarnLotNumber: string | null;
}
export interface UserProfile {
    name: string;
    role: string;
    department: string;
}
export interface DispatchBalance {
    yarnCountNe: bigint;
    productType: ProductType;
    totalPackedKg: bigint;
    lotNumber: string;
    spinningUnit: SpinningUnit;
    totalDispatchedKg: bigint;
    availableKg: bigint;
    endUse: EndUse;
}
export enum DispatchDestination {
    tfo = "tfo",
    amravati = "amravati",
    kolhapur = "kolhapur",
    ambala = "ambala",
    weaving = "weaving",
    outside = "outside",
    softWinding = "softWinding"
}
export enum EndUse {
    tfo = "tfo",
    ground = "ground",
    pile = "pile",
    warp = "warp",
    weft = "weft"
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
    autocoro = "autocoro",
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
    lt = "lt",
    bamboo = "bamboo",
    polyester = "polyester",
    viscose = "viscose",
    carded = "carded",
    combed = "combed"
}
export enum PurchaseOrderStatus {
    closed = "closed",
    open = "open",
    partiallyReceived = "partiallyReceived"
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
export enum SpinningUnit {
    tfo = "tfo",
    openend = "openend",
    ringSpinning = "ringSpinning",
    outsideYarn = "outsideYarn"
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
export enum Warehouse {
    oeRawMaterial = "oeRawMaterial",
    ringRawMaterial = "ringRawMaterial"
}
export interface backendInterface {
    addBatchStage(batchId: bigint, stage: ProcessStage, weightInKg: bigint, weightOutKg: bigint, machineId: bigint, startTime: Time, endTime: Time, operatorNotes: string): Promise<bigint>;
    addInwardEntry(inwardNumber: string, purchaseOrderId: bigint, inwardDate: Time, materialName: string, receivedQty: bigint, warehouse: Warehouse, vehicleNumber: string, remarks: string): Promise<bigint>;
    addProductionLog(shift: Shift, date: Time, machineId: bigint, quantityKg: bigint, efficiencyPercent: bigint, operatorName: string): Promise<bigint>;
    addQualityTest(batchId: bigint, csp: bigint, elongationPercent: bigint, evennessPercent: bigint, thinPlaces: bigint, thickPlaces: bigint, neps: bigint, hairinessIndex: bigint, pass: boolean): Promise<bigint>;
    addRawMaterial(lotNumber: string, supplier: string, grade: string, weightKg: bigint, warehouse: Warehouse, inwardEntryId: bigint | null): Promise<bigint>;
    addRawMaterialOpeningStock(materialName: string, supplier: string, grade: string, weightKg: bigint, warehouse: Warehouse, date: Time): Promise<bigint>;
    addYarnInventory(lotNumber: string, yarnCountNe: bigint, twistDirection: TwistDirection, quantityCones: bigint, weightKg: bigint, status: InventoryStatus): Promise<bigint>;
    addYarnOpeningStock(lotNumber: string, yarnCountNe: bigint, spinningUnit: SpinningUnit, productType: ProductType, endUse: EndUse, weightKg: bigint): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDispatchEntry(lotNumber: string, destination: DispatchDestination, quantityKg: bigint, dispatchDate: Time, remarks: string): Promise<bigint>;
    createMaterialIssue(department: string, warehouse: Warehouse, materialName: string, grade: string, issuedQty: bigint, remarks: string, issueDate: bigint): Promise<bigint>;
    createPackingEntry(lotNumber: string, quantityKg: bigint, remarks: string, packingDate: Time): Promise<bigint>;
    createProductionOrder(orderNumber: string, lotNumber: string, productType: ProductType, spinningUnit: SpinningUnit, endUse: EndUse, yarnCountNe: bigint, twistDirection: TwistDirection, quantityKg: bigint, targetDate: Time, status: OrderStatus, singleYarnLotNumber: string | null): Promise<bigint>;
    createPurchaseOrder(poNumber: string, supplier: string, materialName: string, orderedQty: bigint, orderDate: Time, expectedDeliveryDate: Time): Promise<bigint>;
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
    getProductionOrderBalance(yarnCountNe: bigint, lotNumber: string): Promise<ProductionOrderBalance | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    claimAdminIfNoAdminExists(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    setYarnCountLabel(lotNumber: string, countLabel: string): Promise<void>;
    getAllYarnCountLabels(): Promise<Array<[string, string]>>;
    registerMachine(name: string, machineType: MachineType, machineNumber: string, status: MachineStatus, currentOrderId: bigint | null, runningCount: bigint | null, runningLotNumber: string | null): Promise<bigint>;
    removeUser(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBatchStage(id: bigint, batchId: bigint, stage: ProcessStage, weightInKg: bigint, weightOutKg: bigint, machineId: bigint, startTime: Time, endTime: Time, operatorNotes: string): Promise<void>;
    updateMachine(id: bigint, name: string, machineType: MachineType, machineNumber: string, status: MachineStatus, currentOrderId: bigint | null, runningCount: bigint | null, runningLotNumber: string | null): Promise<void>;
    updateProductionLog(id: bigint, shift: Shift, date: Time, machineId: bigint, quantityKg: bigint, efficiencyPercent: bigint, operatorName: string): Promise<void>;
    updateProductionOrder(id: bigint, orderNumber: string, lotNumber: string, productType: ProductType, spinningUnit: SpinningUnit, endUse: EndUse, yarnCountNe: bigint, twistDirection: TwistDirection, quantityKg: bigint, targetDate: Time, status: OrderStatus, singleYarnLotNumber: string | null): Promise<void>;
    updatePurchaseOrder(id: bigint, poNumber: string, supplier: string, materialName: string, orderedQty: bigint, orderDate: Time, expectedDeliveryDate: Time): Promise<void>;
    updateQualityTest(id: bigint, batchId: bigint, csp: bigint, elongationPercent: bigint, evennessPercent: bigint, thinPlaces: bigint, thickPlaces: bigint, neps: bigint, hairinessIndex: bigint, pass: boolean): Promise<void>;
    updateRawMaterial(id: bigint, lotNumber: string, supplier: string, grade: string, weightKg: bigint, status: RawMaterialStatus, warehouse: Warehouse): Promise<void>;
    updateUserRole(user: Principal, newRole: UserRole): Promise<void>;
    updateYarnInventory(id: bigint, lotNumber: string, yarnCountNe: bigint, twistDirection: TwistDirection, quantityCones: bigint, weightKg: bigint, status: InventoryStatus): Promise<void>;
}
