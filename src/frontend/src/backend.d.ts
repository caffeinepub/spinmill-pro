import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserEntry {
    principal: Principal;
    role: UserRole;
}
export type Time = bigint;
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
export interface UserProfile {
    name: string;
    role: string;
    department: string;
}
export enum EndUse {
    tfo = "tfo",
    ground = "ground",
    pile = "pile",
    warp = "warp",
    weft = "weft"
}
export enum ProductType {
    lt = "lt",
    bamboo = "bamboo",
    polyester = "polyester",
    viscose = "viscose",
    carded = "carded",
    combed = "combed"
}
export enum RawMaterialStatus {
    available = "available",
    consumed = "consumed",
    inUse = "inUse"
}
export enum SpinningUnit {
    openend = "openend",
    ringSpinning = "ringSpinning"
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
    addRawMaterialOpeningStock(materialName: string, supplier: string, grade: string, weightKg: bigint, warehouse: Warehouse, date: Time): Promise<bigint>;
    addYarnOpeningStock(lotNumber: string, yarnCountNe: bigint, spinningUnit: SpinningUnit, productType: ProductType, endUse: EndUse, weightKg: bigint): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteRawMaterialOpeningStock(id: bigint): Promise<void>;
    deleteYarnOpeningStock(id: bigint): Promise<void>;
    getAllRawMaterialOpeningStock(): Promise<Array<RawMaterial>>;
    getAllRawMaterials(): Promise<Array<RawMaterial>>;
    getAllUsers(): Promise<Array<UserEntry>>;
    getAllYarnOpeningStock(): Promise<Array<YarnOpeningStockRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    removeUser(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateUserRole(user: Principal, newRole: UserRole): Promise<void>;
}
