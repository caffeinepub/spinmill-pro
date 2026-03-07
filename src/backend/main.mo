import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  type RawMaterial = {
    id : Nat;
    lotNumber : Text;
    supplier : Text;
    grade : Text;
    weightKg : Nat;
    dateReceived : Time.Time;
    status : RawMaterialStatus;
    warehouse : Warehouse;
    inwardEntryId : ?Nat;
  };

  type RawMaterialStatus = { #available; #inUse; #consumed };
  type ProductionOrder = {
    id : Nat;
    orderNumber : Text;
    lotNumber : Text;
    productType : ProductType;
    spinningUnit : SpinningUnit;
    endUse : EndUse;
    yarnCountNe : Nat;
    twistDirection : TwistDirection;
    quantityKg : Nat;
    targetDate : Time.Time;
    status : OrderStatus;
  };

  type ProductType = {
    #carded;
    #combed;
    #polyester;
    #bamboo;
    #viscose;
    #lt;
  };

  type SpinningUnit = { #openend; #ringSpinning };
  type EndUse = { #warp; #weft; #pile; #ground; #tfo };
  type TwistDirection = { #s; #z };
  type OrderStatus = { #pending; #inProgress; #completed; #cancelled };

  type Machine = {
    id : Nat;
    name : Text;
    machineType : MachineType;
    machineNumber : Text;
    status : MachineStatus;
    currentOrderId : ?Nat;
    runningCount : ?Nat;
    runningLotNumber : ?Text;
    maintenanceStartTime : ?Time.Time;
    totalMaintenanceDurationMins : Nat;
  };

  type MachineType = {
    #blowroom;
    #carding;
    #drawing;
    #combing;
    #roving;
    #ringFrame;
    #winding;
    #autocoro;
  };

  type MachineStatus = { #running; #idle; #maintenance };

  type BatchStage = {
    id : Nat;
    batchId : Nat;
    stage : ProcessStage;
    weightInKg : Nat;
    weightOutKg : Nat;
    machineId : Nat;
    startTime : Time.Time;
    endTime : Time.Time;
    operatorNotes : Text;
  };

  type ProcessStage = {
    #blowroom;
    #carding;
    #drawing;
    #combing;
    #roving;
    #ringSpinning;
    #winding;
    #qualityCheck;
    #finished;
  };

  type QualityTest = {
    id : Nat;
    batchId : Nat;
    csp : Nat;
    elongationPercent : Nat;
    evennessPercent : Nat;
    thinPlaces : Nat;
    thickPlaces : Nat;
    neps : Nat;
    hairinessIndex : Nat;
    pass : Bool;
  };

  type ProductionLog = {
    id : Nat;
    shift : Shift;
    date : Time.Time;
    machineId : Nat;
    quantityKg : Nat;
    efficiencyPercent : Nat;
    operatorName : Text;
  };

  type Shift = { #morning; #afternoon; #night };
  type YarnInventory = {
    id : Nat;
    lotNumber : Text;
    yarnCountNe : Nat;
    twistDirection : TwistDirection;
    quantityCones : Nat;
    weightKg : Nat;
    status : InventoryStatus;
  };

  type InventoryStatus = { #inStock; #dispatched };

  public type UserProfile = {
    name : Text;
    role : Text;
    department : Text;
  };

  type DashboardStats = {
    totalActiveOrders : Nat;
    totalMachinesRunning : Nat;
    totalRawMaterialWeightAvailable : Nat;
    totalYarnInventoryWeight : Nat;
    recentQualityTestPassRate : Nat;
    totalInwardTodayKg : Nat;
    oeWarehouseStockKg : Nat;
    ringWarehouseStockKg : Nat;
    totalDispatchedTodayKg : Nat;
  };

  type PurchaseOrderStatus = {
    #open;
    #partiallyReceived;
    #closed;
  };

  type PurchaseOrder = {
    id : Nat;
    poNumber : Text;
    supplier : Text;
    materialName : Text;
    orderedQty : Nat;
    orderDate : Time.Time;
    expectedDeliveryDate : Time.Time;
    status : PurchaseOrderStatus;
  };

  type Warehouse = { #oeRawMaterial; #ringRawMaterial };
  type MaterialIssue = {
    id : Nat;
    issueNumber : Text;
    issueDate : Time.Time;
    department : Text;
    warehouse : Warehouse;
    materialName : Text;
    grade : Text;
    issuedQty : Nat;
    remarks : Text;
  };

  type InwardEntry = {
    id : Nat;
    inwardNumber : Text;
    purchaseOrderId : Nat;
    inwardDate : Time.Time;
    materialName : Text;
    receivedQty : Nat;
    warehouse : Warehouse;
    vehicleNumber : Text;
    remarks : Text;
  };

  type WarehouseStock = {
    warehouse : Warehouse;
    materialName : Text;
    totalQty : Nat;
  };

  type POBalance = {
    orderedQty : Nat;
    receivedQty : Nat;
    balanceQty : Nat;
  };

  public type ProductionOrderBalance = {
    orderId : Nat;
    orderQty : Nat;
    producedQty : Nat;
    balanceQty : Int;
    isFulfilled : Bool;
  };

  type PackingEntry = {
    id : Nat;
    packingNumber : Text;
    packingDate : Time.Time;
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    quantityKg : Nat;
    remarks : Text;
  };

  type PackingBalance = {
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    availableKg : Nat;
    totalPackedKg : Nat;
  };

  public type DispatchEntry = {
    id : Nat;
    dispatchNumber : Text;
    dispatchDate : Time.Time;
    lotNumber : Text;
    destination : DispatchDestination;
    quantityKg : Nat;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    remarks : Text;
  };

  type DispatchDestination = {
    #weaving;
    #kolhapur;
    #ambala;
    #outside;
    #amravati;
    #softWinding;
    #tfo;
  };

  type DispatchBalance = {
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    totalPackedKg : Nat;
    totalDispatchedKg : Nat;
    availableKg : Nat;
  };

  type YarnOpeningStockRecord = {
    id : Nat;
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    weightKg : Nat;
    createdAt : Time.Time;
  };

  var rawMaterialIdCounter = 0;
  var productionOrderIdCounter = 0;
  var machineIdCounter = 0;
  var batchStageIdCounter = 0;
  var qualityTestIdCounter = 0;
  var productionLogIdCounter = 0;
  var yarnInventoryIdCounter = 0;
  var purchaseOrderIdCounter = 0;
  var inwardEntryIdCounter = 0;
  var materialIssueIdCounter = 1;
  var packingEntryIdCounter = 1;
  var dispatchEntryIdCounter = 1;
  var yarnOpeningStockIdCounter = 1;

  let dispatchEntries = Map.empty<Nat, DispatchEntry>();
  let rawMaterials = Map.empty<Nat, RawMaterial>();
  let productionOrders = Map.empty<Nat, ProductionOrder>();
  let machines = Map.empty<Nat, Machine>();
  let batches = Map.empty<Nat, BatchStage>();
  let qualityTests = Map.empty<Nat, QualityTest>();
  let productionLogs = Map.empty<Nat, ProductionLog>();
  let yarnInventory = Map.empty<Nat, YarnInventory>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let purchaseOrders = Map.empty<Nat, PurchaseOrder>();
  let inwardEntries = Map.empty<Nat, InwardEntry>();
  let warehouseStock = Map.empty<Text, WarehouseStock>();
  let materialIssues = Map.empty<Nat, MaterialIssue>();
  let packingEntries = Map.empty<Nat, PackingEntry>();
  let yarnOpeningStock = Map.empty<Nat, YarnOpeningStockRecord>();

  let openingStockRawMaterialIds = Set.empty<Nat>();
  let openingStockYarnIds = Set.empty<Nat>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserEntry = {
    principal : Principal;
    role : AccessControl.UserRole;
  };

  public query ({ caller }) func getAllUsers() : async [UserEntry] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      return [];
    };
    let entries = accessControlState.userRoles.entries();
    let users = entries.map(
      func((principal, role)) {
        {
          principal;
          role;
        };
      }
    );
    users.toArray();
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove users");
    };
    if (caller == user) {
      Runtime.trap("Cannot remove yourself");
    };

    let currentRole = accessControlState.userRoles.get(user);
    switch (currentRole) {
      case (null) { Runtime.trap("User does not exist") };
      case (?role) {
        accessControlState.userRoles.remove(user);
      };
    };
  };

  public shared ({ caller }) func updateUserRole(user : Principal, newRole : AccessControl.UserRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update user roles");
    };
    if (caller == user) {
      Runtime.trap("Cannot change your own role");
    };
    accessControlState.userRoles.add(user, newRole);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func addRawMaterialOpeningStock(
    materialName : Text,
    supplier : Text,
    grade : Text,
    weightKg : Nat,
    warehouse : Warehouse,
    date : Time.Time,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add raw material opening stock");
    };

    let id = rawMaterialIdCounter;
    let rawMaterial : RawMaterial = {
      id;
      lotNumber = materialName;
      supplier;
      grade = if (grade == "") { materialName } else {
        grade;
      };
      weightKg;
      dateReceived = date;
      status = #available;
      warehouse;
      inwardEntryId = null;
    };
    rawMaterials.add(id, rawMaterial);
    openingStockRawMaterialIds.add(id);
    rawMaterialIdCounter += 1;

    await updateWarehouseStock(warehouse, materialName, weightKg);

    id;
  };

  public query ({ caller }) func getAllRawMaterialOpeningStock() : async [RawMaterial] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view raw material opening stock");
    };
    let openingStockMaterials = List.empty<RawMaterial>();
    for (id in openingStockRawMaterialIds.values()) {
      switch (rawMaterials.get(id)) {
        case (?material) { openingStockMaterials.add(material) };
        case (null) {};
      };
    };
    openingStockMaterials.toArray().sort(func(a : RawMaterial, b : RawMaterial) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deleteRawMaterialOpeningStock(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete raw material opening stock");
    };

    if (not openingStockRawMaterialIds.contains(id)) {
      Runtime.trap("Raw material is not an opening stock entry");
    };

    let material = switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?m) { m };
    };

    let stockKey = warehouseToText(material.warehouse) # "_" # material.lotNumber;
    let currentStock = switch (warehouseStock.get(stockKey)) {
      case (null) { Runtime.trap("Warehouse stock not found") };
      case (?s) { s };
    };

    if (currentStock.totalQty < material.weightKg) {
      Runtime.trap("Cannot delete: insufficient warehouse stock");
    };

    let newStock = {
      currentStock with totalQty = currentStock.totalQty - material.weightKg;
    };
    warehouseStock.add(stockKey, newStock);

    rawMaterials.remove(id);
    openingStockRawMaterialIds.remove(id);
  };

  public shared ({ caller }) func addYarnOpeningStock(
    lotNumber : Text,
    yarnCountNe : Nat,
    spinningUnit : SpinningUnit,
    productType : ProductType,
    endUse : EndUse,
    weightKg : Nat,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add yarn opening stock");
    };

    let id = yarnOpeningStockIdCounter;
    let record : YarnOpeningStockRecord = {
      id;
      lotNumber;
      yarnCountNe;
      spinningUnit;
      productType;
      endUse;
      weightKg;
      createdAt = Time.now();
    };
    yarnOpeningStock.add(id, record);
    openingStockYarnIds.add(id);
    yarnOpeningStockIdCounter += 1;
    id;
  };

  public query func getAllYarnOpeningStock() : async [YarnOpeningStockRecord] {
    let allRecords = List.empty<YarnOpeningStockRecord>();
    for ((_, record) in yarnOpeningStock.entries()) {
      allRecords.add(record);
    };
    allRecords.toArray().sort(func(a : YarnOpeningStockRecord, b : YarnOpeningStockRecord) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deleteYarnOpeningStock(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };

    if (not openingStockYarnIds.contains(id)) {
      Runtime.trap("Yarn opening stock entry not found");
    };

    yarnOpeningStock.remove(id);
    openingStockYarnIds.remove(id);
  };

  func warehouseToText(warehouse : Warehouse) : Text {
    switch (warehouse) {
      case (#oeRawMaterial) { "OE" };
      case (#ringRawMaterial) { "RING" };
    };
  };

  func updateWarehouseStock(warehouse : Warehouse, materialName : Text, qty : Nat) : async () {
    let key = warehouseToText(warehouse) # "_" # materialName;
    let currentStock = warehouseStock.get(key);
    switch (currentStock) {
      case (null) {
        let newStock : WarehouseStock = {
          warehouse;
          materialName;
          totalQty = qty;
        };
        warehouseStock.add(key, newStock);
      };
      case (?stock) {
        let updatedStock = {
          stock with totalQty = stock.totalQty + qty;
        };
        warehouseStock.add(key, updatedStock);
      };
    };
  };

  public query ({ caller }) func getAllRawMaterials() : async [RawMaterial] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    let allMaterials = List.empty<RawMaterial>();
    for ((_, m) in rawMaterials.entries()) {
      allMaterials.add(m);
    };
    allMaterials.toArray().sort(func(a : RawMaterial, b : RawMaterial) : Order.Order { Nat.compare(a.id, b.id) });
  };
};
