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
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func createPackingEntry(
    lotNumber : Text,
    quantityKg : Nat,
    remarks : Text,
    packingDate : Time.Time,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create packing entries");
    };

    let inventoryEntry = switch (yarnInventory.values().find(func(inv) { inv.lotNumber == lotNumber })) {
      case (?entry) { entry };
      case (null) { Runtime.trap("Yarn inventory not found") };
    };

    let productionOrder = switch (productionOrders.values().find(func(po) { po.lotNumber == lotNumber })) {
      case (?po) { po };
      case (null) { Runtime.trap("Production order not found") };
    };

    if (quantityKg > inventoryEntry.weightKg) {
      Runtime.trap("Not enough inventory for packing quantity");
    };

    let packingNumber = "PKG-2026-" # (if (packingEntryIdCounter < 10) {
      "00";
    } else if (packingEntryIdCounter < 100) { "0" } else { "" }) # packingEntryIdCounter.toText();

    let newEntry : PackingEntry = {
      id = packingEntryIdCounter;
      packingNumber;
      packingDate;
      lotNumber;
      yarnCountNe = productionOrder.yarnCountNe;
      spinningUnit = productionOrder.spinningUnit;
      productType = productionOrder.productType;
      endUse = productionOrder.endUse;
      quantityKg;
      remarks;
    };

    packingEntries.add(packingEntryIdCounter, newEntry);

    let remainingWeight = inventoryEntry.weightKg - quantityKg;
    if (remainingWeight == 0) {
      yarnInventory.remove(inventoryEntry.id);
    } else {
      let updatedInventory = {
        inventoryEntry with
        weightKg = remainingWeight;
      };
      yarnInventory.add(inventoryEntry.id, updatedInventory);
    };

    packingEntryIdCounter += 1;
    newEntry.id;
  };

  public query ({ caller }) func getAllPackingEntries() : async [PackingEntry] {
    packingEntries.values().toArray().sort(func(a: PackingEntry, b: PackingEntry): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deletePackingEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete packing entries");
    };

    let entry = switch (packingEntries.get(id)) {
      case (null) { Runtime.trap("Packing entry not found") };
      case (?e) { e };
    };

    let existingInventory = yarnInventory.values().find(
      func(inv) { inv.lotNumber == entry.lotNumber }
    );

    switch (existingInventory) {
      case (?inventory) {
        let updatedInventory = {
          inventory with
          weightKg = inventory.weightKg + entry.quantityKg;
        };
        yarnInventory.add(inventory.id, updatedInventory);
      };
      case (null) {
        let newInventory : YarnInventory = {
          id = yarnInventoryIdCounter;
          lotNumber = entry.lotNumber;
          yarnCountNe = entry.yarnCountNe;
          twistDirection = #s;
          quantityCones = 0;
          weightKg = entry.quantityKg;
          status = #inStock;
        };
        yarnInventory.add(yarnInventoryIdCounter, newInventory);
        yarnInventoryIdCounter += 1;
      };
    };

    packingEntries.remove(id);
  };

  public query ({ caller }) func getNextPackingNumber() : async Text {
    let formattedNum = if (packingEntryIdCounter < 10) {
      "00" # packingEntryIdCounter.toText();
    } else if (packingEntryIdCounter < 100) {
      "0" # packingEntryIdCounter.toText();
    } else {
      packingEntryIdCounter.toText();
    };
    "PKG-2026-" # formattedNum;
  };

  public query ({ caller }) func getPackingBalance(lotNumber : Text) : async ?PackingBalance {
    let inventoryEntry = yarnInventory.values().find(
      func(inv) { inv.lotNumber == lotNumber }
    );
    let productionOrder = productionOrders.values().find(func(po) { po.lotNumber == lotNumber });

    switch (productionOrder) {
      case (null) { null };
      case (?po) {
        var totalPackedKg = 0;
        for (entry in packingEntries.values()) {
          if (entry.lotNumber == lotNumber) {
            totalPackedKg += entry.quantityKg;
          };
        };
        let availableKg = switch (inventoryEntry) {
          case (?inventory) { inventory.weightKg };
          case (null) { 0 };
        };
        ?{
          lotNumber;
          yarnCountNe = po.yarnCountNe;
          spinningUnit = po.spinningUnit;
          productType = po.productType;
          endUse = po.endUse;
          availableKg;
          totalPackedKg;
        };
      };
    };
  };

  public shared ({ caller }) func createDispatchEntry(
    lotNumber : Text,
    destination : DispatchDestination,
    quantityKg : Nat,
    dispatchDate : Time.Time,
    remarks : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create dispatch entries");
    };

    let packingEntry = switch (packingEntries.values().find(func(pe) { pe.lotNumber == lotNumber })) {
      case (?pe) { pe };
      case (null) { Runtime.trap("Packing entry not found") };
    };

    let totalPackedKg = packingEntries.values().foldLeft(
      0,
      func(acc, entry) {
        if (entry.lotNumber == lotNumber) {
          acc + entry.quantityKg;
        } else { acc };
      },
    );

    let totalDispatchedKg = dispatchEntries.values().foldLeft(
      0,
      func(acc, entry) {
        if (entry.lotNumber == lotNumber) {
          acc + entry.quantityKg;
        } else { acc };
      },
    );

    let availableKg = if (totalPackedKg > totalDispatchedKg) {
      totalPackedKg - totalDispatchedKg;
    } else { 0 };

    if (quantityKg > availableKg) {
      Runtime.trap("Not enough stock available for dispatch");
    };

    let dispatchNumber = "DSP-2026-" # (if (dispatchEntryIdCounter < 10) {
      "00";
    } else if (dispatchEntryIdCounter < 100) { "0" : Text } else {
      "" : Text;
    }) # dispatchEntryIdCounter.toText();

    let newEntry : DispatchEntry = {
      id = dispatchEntryIdCounter;
      dispatchNumber;
      dispatchDate;
      lotNumber;
      destination;
      quantityKg;
      yarnCountNe = packingEntry.yarnCountNe;
      spinningUnit = packingEntry.spinningUnit;
      productType = packingEntry.productType;
      endUse = packingEntry.endUse;
      remarks;
    };

    dispatchEntries.add(dispatchEntryIdCounter, newEntry);
    dispatchEntryIdCounter += 1;
    newEntry.id;
  };

  public query ({ caller }) func getAllDispatchEntries() : async [DispatchEntry] {
    dispatchEntries.values().toArray().sort(func(a: DispatchEntry, b: DispatchEntry): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deleteDispatchEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete dispatch entries");
    };

    switch (dispatchEntries.get(id)) {
      case (null) { Runtime.trap("Dispatch entry not found") };
      case (?entry) {
        dispatchEntries.remove(id);
      };
    };
  };

  public query ({ caller }) func getNextDispatchNumber() : async Text {
    let formattedNum = if (dispatchEntryIdCounter < 10) {
      "00" # dispatchEntryIdCounter.toText();
    } else if (dispatchEntryIdCounter < 100) {
      "0" # dispatchEntryIdCounter.toText();
    } else {
      dispatchEntryIdCounter.toText();
    };
    "DSP-2026-" # formattedNum;
  };

  public query ({ caller }) func getDispatchBalance(lotNumber : Text) : async ?DispatchBalance {
    let packingEntry = packingEntries.values().find(func(pe) { pe.lotNumber == lotNumber });

    switch (packingEntry) {
      case (null) { null };
      case (?pe) {
        var totalPackedKg = 0;
        var totalDispatchedKg = 0;

        for (entry in packingEntries.values()) {
          if (entry.lotNumber == lotNumber) {
            totalPackedKg += entry.quantityKg;
          };
        };

        for (entry in dispatchEntries.values()) {
          if (entry.lotNumber == lotNumber) {
            totalDispatchedKg += entry.quantityKg;
          };
        };

        let availableKg = if (totalPackedKg > totalDispatchedKg) {
          totalPackedKg - totalDispatchedKg;
        } else { 0 };

        ?{
          lotNumber;
          yarnCountNe = pe.yarnCountNe;
          spinningUnit = pe.spinningUnit;
          productType = pe.productType;
          endUse = pe.endUse;
          totalPackedKg;
          totalDispatchedKg;
          availableKg;
        };
      };
    };
  };

  public shared ({ caller }) func addRawMaterial(
    lotNumber : Text,
    supplier : Text,
    grade : Text,
    weightKg : Nat,
    warehouse : Warehouse,
    inwardEntryId : ?Nat,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add raw materials");
    };

    let id = rawMaterialIdCounter;
    let rawMaterial : RawMaterial = {
      id;
      lotNumber;
      supplier;
      grade;
      weightKg;
      dateReceived = Time.now();
      status = #available;
      warehouse;
      inwardEntryId;
    };
    rawMaterials.add(id, rawMaterial);
    rawMaterialIdCounter += 1;
    id;
  };

  public query ({ caller }) func getRawMaterial(id : Nat) : async ?RawMaterial {
    rawMaterials.get(id);
  };

  public query ({ caller }) func getAllRawMaterials() : async [RawMaterial] {
    rawMaterials.values().toArray().sort(func(a: RawMaterial, b: RawMaterial): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateRawMaterial(
    id : Nat,
    lotNumber : Text,
    supplier : Text,
    grade : Text,
    weightKg : Nat,
    status : RawMaterialStatus,
    warehouse : Warehouse,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update raw materials");
    };

    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?old) {
        let updated : RawMaterial = {
          id;
          lotNumber;
          supplier;
          grade;
          weightKg;
          dateReceived = Time.now();
          status;
          warehouse;
          inwardEntryId = old.inwardEntryId;
        };
        rawMaterials.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteRawMaterial(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete raw materials");
    };

    if (not rawMaterials.containsKey(id)) { Runtime.trap("Raw material not found") };
    rawMaterials.remove(id);
  };

  public shared ({ caller }) func createMaterialIssue(
    department : Text,
    warehouse : Warehouse,
    materialName : Text,
    grade : Text,
    issuedQty : Nat,
    remarks : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create material issues");
    };

    let issueId = materialIssueIdCounter;
    let issueNumber = "ISS-2026-" # (if (issueId < 10) { "00" } else if (issueId < 100) {
      "0";
    } else { "" }) # issueId.toText();

    let stockKey = warehouseToText(warehouse) # "_" # materialName;
    let currentStock = switch (warehouseStock.get(stockKey)) {
      case (null) { Runtime.trap("No stock found for this material and warehouse") };
      case (?s) { s };
    };

    if (currentStock.totalQty < issuedQty) {
      Runtime.trap("Not enough stock available. Available: " # currentStock.totalQty.toText() # "kg, Requested: " # issuedQty.toText() # "kg");
    };

    let newStock = {
      currentStock with totalQty = currentStock.totalQty - issuedQty;
    };
    warehouseStock.add(stockKey, newStock);

    var remainingQty = issuedQty;

    let rawMaterialIdsToRemove = List.empty<Nat>();
    let rawMaterialsIter = rawMaterials.entries();
    for ((materialId, material) in rawMaterialsIter) {
      let warehouseMatches = switch (material.warehouse, warehouse) {
        case (#oeRawMaterial, #oeRawMaterial) { true };
        case (#ringRawMaterial, #ringRawMaterial) { true };
        case (_) { false };
      };
      let gradeMatches = material.grade == materialName;
      
      if (warehouseMatches and gradeMatches and remainingQty > 0) {
        if (material.weightKg <= remainingQty) {
          remainingQty -= material.weightKg;
          rawMaterialIdsToRemove.add(materialId);
        } else {
          let updatedMaterial : RawMaterial = {
            material with weightKg = material.weightKg - remainingQty
          };
          rawMaterials.add(materialId, updatedMaterial);
          remainingQty := 0;
        };
      };
    };

    let toRemoveArray = rawMaterialIdsToRemove.toArray();
    let toRemoveIter = toRemoveArray.values();
    for (rawMatId in toRemoveIter) {
      rawMaterials.remove(rawMatId);
    };

    let issue : MaterialIssue = {
      id = issueId;
      issueNumber;
      issueDate = Time.now();
      department;
      warehouse;
      materialName;
      grade;
      issuedQty;
      remarks;
    };

    materialIssues.add(issueId, issue);
    materialIssueIdCounter += 1;
    issueId;
  };

  public query ({ caller }) func getAllMaterialIssues() : async [MaterialIssue] {
    materialIssues.values().toArray().sort(func(a: MaterialIssue, b: MaterialIssue): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deleteMaterialIssue(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete material issues");
    };

    let issue = switch (materialIssues.get(id)) {
      case (null) { Runtime.trap("Material issue not found") };
      case (?issue) { issue };
    };

    let stockKey = warehouseToText(issue.warehouse) # "_" # issue.materialName;
    let currentStock = switch (warehouseStock.get(stockKey)) {
      case (null) { Runtime.trap("No warehouse stock found for this issue") };
      case (?s) { s };
    };

    let newStock = {
      currentStock with totalQty = currentStock.totalQty + issue.issuedQty;
    };
    warehouseStock.add(stockKey, newStock);

    materialIssues.remove(id);
  };

  public query ({ caller }) func getNextIssueNumber() : async Text {
    let nextIssueNum = materialIssueIdCounter;
    let formattedNum = if (nextIssueNum < 10) {
      "00" # nextIssueNum.toText();
    } else if (nextIssueNum < 100) {
      "0" # nextIssueNum.toText();
    } else {
      nextIssueNum.toText();
    };
    "ISS-2026-" # formattedNum;
  };

  public shared ({ caller }) func createProductionOrder(
    orderNumber : Text,
    lotNumber : Text,
    productType : ProductType,
    spinningUnit : SpinningUnit,
    endUse : EndUse,
    yarnCountNe : Nat,
    twistDirection : TwistDirection,
    quantityKg : Nat,
    targetDate : Time.Time,
    status : OrderStatus,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create production orders");
    };

    let id = productionOrderIdCounter;
    let order : ProductionOrder = {
      id;
      orderNumber;
      lotNumber;
      productType;
      spinningUnit;
      endUse;
      yarnCountNe;
      twistDirection;
      quantityKg;
      targetDate;
      status;
    };
    productionOrders.add(id, order);
    productionOrderIdCounter += 1;
    id;
  };

  public query ({ caller }) func getProductionOrder(id : Nat) : async ?ProductionOrder {
    productionOrders.get(id);
  };

  public query ({ caller }) func getAllProductionOrders() : async [ProductionOrder] {
    productionOrders.values().toArray().sort(func(a: ProductionOrder, b: ProductionOrder): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateProductionOrder(
    id : Nat,
    orderNumber : Text,
    lotNumber : Text,
    productType : ProductType,
    spinningUnit : SpinningUnit,
    endUse : EndUse,
    yarnCountNe : Nat,
    twistDirection : TwistDirection,
    quantityKg : Nat,
    targetDate : Time.Time,
    status : OrderStatus,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update production orders");
    };

    switch (productionOrders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?_) {
        let updated : ProductionOrder = {
          id;
          orderNumber;
          lotNumber;
          productType;
          spinningUnit;
          endUse;
          yarnCountNe;
          twistDirection;
          quantityKg;
          targetDate;
          status;
        };
        productionOrders.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteProductionOrder(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete production orders");
    };

    if (not productionOrders.containsKey(id)) { Runtime.trap("Order not found") };
    productionOrders.remove(id);
  };

  public shared ({ caller }) func registerMachine(name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat, runningCount : ?Nat, runningLotNumber : ?Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register machines");
    };

    let id = machineIdCounter;
    let newMaintenanceStartTime = switch (status) {
      case (#maintenance) { ?Time.now() };
      case (_) { null };
    };
    let machine : Machine = {
      id;
      name;
      machineType;
      machineNumber;
      status;
      currentOrderId;
      runningCount;
      runningLotNumber;
      maintenanceStartTime = newMaintenanceStartTime;
      totalMaintenanceDurationMins = 0;
    };
    machines.add(id, machine);
    machineIdCounter += 1;
    id;
  };

  public query ({ caller }) func getMachine(id : Nat) : async ?Machine {
    machines.get(id);
  };

  public query ({ caller }) func getAllMachines() : async [Machine] {
    machines.values().toArray().sort(func(a: Machine, b: Machine): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateMachine(id : Nat, name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat, runningCount : ?Nat, runningLotNumber : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update machines");
    };

    switch (machines.get(id)) {
      case (null) { Runtime.trap("Machine not found") };
      case (?existing) {
        let now = Time.now();

        let wasInMaintenance = switch (existing.status) {
          case (#maintenance) { true };
          case (_) { false };
        };

        let updatedMaintenanceStartTime = switch (status) {
          case (#maintenance) { ?now };
          case (_) { null };
        };

        let updatedTotalMaintenanceDurationMins = switch (status, existing.maintenanceStartTime, wasInMaintenance) {
          case (#maintenance, _, _) { existing.totalMaintenanceDurationMins };
          case (_, ?start, true) {
            let duration = ((now - start) / 60_000_000_000).toNat();
            existing.totalMaintenanceDurationMins + duration;
          };
          case (_, _, _) { existing.totalMaintenanceDurationMins };
        };

        let updated : Machine = {
          id;
          name;
          machineType;
          machineNumber;
          status;
          currentOrderId;
          runningCount;
          runningLotNumber;
          maintenanceStartTime = updatedMaintenanceStartTime;
          totalMaintenanceDurationMins = updatedTotalMaintenanceDurationMins;
        };
        machines.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteMachine(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete machines");
    };

    if (not machines.containsKey(id)) { Runtime.trap("Machine not found") };
    machines.remove(id);
  };

  public shared ({ caller }) func addBatchStage(batchId : Nat, stage : ProcessStage, weightInKg : Nat, weightOutKg : Nat, machineId : Nat, startTime : Time.Time, endTime : Time.Time, operatorNotes : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add batch stages");
    };

    let id = batchStageIdCounter;
    let batchStage : BatchStage = {
      id;
      batchId;
      stage;
      weightInKg;
      weightOutKg;
      machineId;
      startTime;
      endTime;
      operatorNotes;
    };
    batches.add(id, batchStage);
    batchStageIdCounter += 1;
    id;
  };

  public query ({ caller }) func getBatchStage(id : Nat) : async ?BatchStage {
    batches.get(id);
  };

  public query ({ caller }) func getAllBatchStages() : async [BatchStage] {
    batches.values().toArray().sort(func(a: BatchStage, b: BatchStage): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateBatchStage(id : Nat, batchId : Nat, stage : ProcessStage, weightInKg : Nat, weightOutKg : Nat, machineId : Nat, startTime : Time.Time, endTime : Time.Time, operatorNotes : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update batch stages");
    };

    switch (batches.get(id)) {
      case (null) { Runtime.trap("Batch stage not found") };
      case (?_) {
        let updated : BatchStage = {
          id;
          batchId;
          stage;
          weightInKg;
          weightOutKg;
          machineId;
          startTime;
          endTime;
          operatorNotes;
        };
        batches.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteBatchStage(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete batch stages");
    };

    if (not batches.containsKey(id)) { Runtime.trap("Batch stage not found") };
    batches.remove(id);
  };

  public shared ({ caller }) func addQualityTest(batchId : Nat, csp : Nat, elongationPercent : Nat, evennessPercent : Nat, thinPlaces : Nat, thickPlaces : Nat, neps : Nat, hairinessIndex : Nat, pass : Bool) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add quality tests");
    };

    let id = qualityTestIdCounter;
    let qualityTest : QualityTest = {
      id;
      batchId;
      csp;
      elongationPercent;
      evennessPercent;
      thinPlaces;
      thickPlaces;
      neps;
      hairinessIndex;
      pass;
    };
    qualityTests.add(id, qualityTest);
    qualityTestIdCounter += 1;
    id;
  };

  public query ({ caller }) func getQualityTest(id : Nat) : async ?QualityTest {
    qualityTests.get(id);
  };

  public query ({ caller }) func getAllQualityTests() : async [QualityTest] {
    qualityTests.values().toArray().sort(func(a: QualityTest, b: QualityTest): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateQualityTest(id : Nat, batchId : Nat, csp : Nat, elongationPercent : Nat, evennessPercent : Nat, thinPlaces : Nat, thickPlaces : Nat, neps : Nat, hairinessIndex : Nat, pass : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update quality tests");
    };

    switch (qualityTests.get(id)) {
      case (null) { Runtime.trap("Quality test not found") };
      case (?_) {
        let updated : QualityTest = {
          id;
          batchId;
          csp;
          elongationPercent;
          evennessPercent;
          thinPlaces;
          thickPlaces;
          neps;
          hairinessIndex;
          pass;
        };
        qualityTests.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteQualityTest(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete quality tests");
    };

    if (not qualityTests.containsKey(id)) { Runtime.trap("Quality test not found") };
    qualityTests.remove(id);
  };

  public shared ({ caller }) func addProductionLog(shift : Shift, date : Time.Time, machineId : Nat, quantityKg : Nat, efficiencyPercent : Nat, operatorName : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add production logs");
    };

    let id = productionLogIdCounter;
    let log : ProductionLog = {
      id;
      shift;
      date;
      machineId;
      quantityKg;
      efficiencyPercent;
      operatorName;
    };
    productionLogs.add(id, log);
    productionLogIdCounter += 1;

    switch (machines.get(machineId)) {
      case (null) {};
      case (?machine) {
        switch (machine.runningCount, machine.runningLotNumber) {
          case (?count, ?lot) {
            var twistDirection : TwistDirection = #z;
            if (productionOrders.size() > 0) {
              switch (productionOrders.values().find(func(o) { o.yarnCountNe == count and o.lotNumber == lot })) {
                case (?order) { twistDirection := order.twistDirection };
                case (null) {};
              };
            };

            let existingInventory = yarnInventory.values().find(
              func(y) { y.lotNumber == lot and y.yarnCountNe == count }
            );

            switch (existingInventory) {
              case (?existing) {
                let updatedInventory = {
                  existing with
                  weightKg = existing.weightKg + quantityKg;
                };
                yarnInventory.add(existing.id, updatedInventory);
              };
              case (null) {
                let newInventory : YarnInventory = {
                  id = yarnInventoryIdCounter;
                  lotNumber = lot;
                  yarnCountNe = count;
                  twistDirection;
                  quantityCones = 0;
                  weightKg = quantityKg;
                  status = #inStock;
                };
                yarnInventory.add(yarnInventoryIdCounter, newInventory);
                yarnInventoryIdCounter += 1;
              };
            };
          };
          case (_, _) {
            ();
          };
        };
      };
    };
    id;
  };

  public query ({ caller }) func getProductionLog(id : Nat) : async ?ProductionLog {
    productionLogs.get(id);
  };

  public query ({ caller }) func getAllProductionLogs() : async [ProductionLog] {
    productionLogs.values().toArray().sort(func(a: ProductionLog, b: ProductionLog): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateProductionLog(id : Nat, shift : Shift, date : Time.Time, machineId : Nat, quantityKg : Nat, efficiencyPercent : Nat, operatorName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update production logs");
    };

    switch (productionLogs.get(id)) {
      case (null) { Runtime.trap("Production log not found") };
      case (?_) {
        let updated : ProductionLog = {
          id;
          shift;
          date;
          machineId;
          quantityKg;
          efficiencyPercent;
          operatorName;
        };
        productionLogs.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteProductionLog(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete production logs");
    };

    let log = switch (productionLogs.get(id)) {
      case (null) { Runtime.trap("Production log not found") };
      case (?log) { log };
    };

    switch (machines.get(log.machineId)) {
      case (null) { () };
      case (?machine) {
        switch (machine.runningCount, machine.runningLotNumber) {
          case (?count, ?lot) {
            let existingInventory = yarnInventory.values().find(
              func(y) { y.lotNumber == lot and y.yarnCountNe == count }
            );

            switch (existingInventory) {
              case (?existing) {
                if (existing.weightKg > log.quantityKg) {
                  let updatedInventory = {
                    existing with
                    weightKg = existing.weightKg - log.quantityKg;
                  };
                  yarnInventory.add(existing.id, updatedInventory);
                } else {
                  yarnInventory.remove(existing.id);
                };
              };
              case (null) { () };
            };
          };
          case (_, _) {
            ();
          };
        };
      };
    };

    productionLogs.remove(id);
  };

  public shared ({ caller }) func addYarnInventory(lotNumber : Text, yarnCountNe : Nat, twistDirection : TwistDirection, quantityCones : Nat, weightKg : Nat, status : InventoryStatus) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add yarn inventory");
    };

    let id = yarnInventoryIdCounter;
    let inventory : YarnInventory = {
      id;
      lotNumber;
      yarnCountNe;
      twistDirection;
      quantityCones;
      weightKg;
      status;
    };
    yarnInventory.add(id, inventory);
    yarnInventoryIdCounter += 1;
    id;
  };

  public query ({ caller }) func getYarnInventory(id : Nat) : async ?YarnInventory {
    yarnInventory.get(id);
  };

  public query ({ caller }) func getAllYarnInventory() : async [YarnInventory] {
    yarnInventory.values().toArray().sort(func(a: YarnInventory, b: YarnInventory): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateYarnInventory(id : Nat, lotNumber : Text, yarnCountNe : Nat, twistDirection : TwistDirection, quantityCones : Nat, weightKg : Nat, status : InventoryStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update yarn inventory");
    };

    switch (yarnInventory.get(id)) {
      case (null) { Runtime.trap("Yarn inventory not found") };
      case (?_) {
        let updated : YarnInventory = {
          id;
          lotNumber;
          yarnCountNe;
          twistDirection;
          quantityCones;
          weightKg;
          status;
        };
        yarnInventory.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteYarnInventory(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete yarn inventory");
    };

    if (not yarnInventory.containsKey(id)) { Runtime.trap("Yarn inventory not found") };
    yarnInventory.remove(id);
  };

  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    var totalActiveOrders = 0;
    for (order in productionOrders.values()) {
      switch (order.status) {
        case (#inProgress) { totalActiveOrders += 1 };
        case (#pending) { totalActiveOrders += 1 };
        case (_) {};
      };
    };

    var totalMachinesRunning = 0;
    for (machine in machines.values()) {
      switch (machine.status) {
        case (#running) { totalMachinesRunning += 1 };
        case (_) {};
      };
    };

    var totalRawMaterialWeightAvailable = 0;
    for (material in rawMaterials.values()) {
      switch (material.status) {
        case (#available) { totalRawMaterialWeightAvailable += material.weightKg };
        case (_) {};
      };
    };

    var totalYarnInventoryWeight = 0;
    for (yarn in yarnInventory.values()) {
      switch (yarn.status) {
        case (#inStock) { totalYarnInventoryWeight += yarn.weightKg };
        case (_) {};
      };
    };

    var totalTests = 0;
    var passedTests = 0;
    for (test in qualityTests.values()) {
      totalTests += 1;
      if (test.pass) {
        passedTests += 1;
      };
    };

    let recentQualityTestPassRate = if (totalTests > 0) { (passedTests * 100) / totalTests } else {
      0;
    };

    let today = Time.now();
    let oneDayNanos = 86_400_000_000_000;

    var totalInwardTodayKg = 0;
    for (inward in inwardEntries.values()) {
      if (today - inward.inwardDate < oneDayNanos) {
        totalInwardTodayKg += inward.receivedQty;
      };
    };

    var oeWarehouseStockKg = 0;
    var ringWarehouseStockKg = 0;
    for (stock in warehouseStock.values()) {
      switch (stock.warehouse) {
        case (#oeRawMaterial) { oeWarehouseStockKg += stock.totalQty };
        case (#ringRawMaterial) { ringWarehouseStockKg += stock.totalQty };
      };
    };

    var totalDispatchedTodayKg = 0;
    for (dispatchEntry in dispatchEntries.values()) {
      if (today - dispatchEntry.dispatchDate < oneDayNanos) {
        totalDispatchedTodayKg += dispatchEntry.quantityKg;
      };
    };

    {
      totalActiveOrders;
      totalMachinesRunning;
      totalRawMaterialWeightAvailable;
      totalYarnInventoryWeight;
      recentQualityTestPassRate;
      totalInwardTodayKg;
      oeWarehouseStockKg;
      ringWarehouseStockKg;
      totalDispatchedTodayKg;
    };
  };

  public shared ({ caller }) func createPurchaseOrder(
    poNumber : Text,
    supplier : Text,
    materialName : Text,
    orderedQty : Nat,
    orderDate : Time.Time,
    expectedDeliveryDate : Time.Time
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create purchase orders");
    };

    let id = purchaseOrderIdCounter;
    let po : PurchaseOrder = {
      id;
      poNumber;
      supplier;
      materialName;
      orderedQty;
      orderDate;
      expectedDeliveryDate;
      status = #open;
    };
    purchaseOrders.add(id, po);
    purchaseOrderIdCounter += 1;
    id;
  };

  public query ({ caller }) func getPurchaseOrder(id : Nat) : async ?PurchaseOrder {
    purchaseOrders.get(id);
  };

  public query ({ caller }) func getAllPurchaseOrders() : async [PurchaseOrder] {
    purchaseOrders.values().toArray();
  };

  public shared ({ caller }) func updatePurchaseOrder(
    id : Nat,
    poNumber : Text,
    supplier : Text,
    materialName : Text,
    orderedQty : Nat,
    orderDate : Time.Time,
    expectedDeliveryDate : Time.Time
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update purchase orders");
    };

    switch (purchaseOrders.get(id)) {
      case (null) { Runtime.trap("Purchase order not found") };
      case (?existingPO) {
        let updated : PurchaseOrder = {
          id;
          poNumber;
          supplier;
          materialName;
          orderedQty;
          orderDate;
          expectedDeliveryDate;
          status = #open;
        };
        purchaseOrders.add(id, updated);
        await recalculatePurchaseOrderStatus(id);
      };
    };
  };

  public shared ({ caller }) func deletePurchaseOrder(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete purchase orders");
    };

    if (not purchaseOrders.containsKey(id)) { Runtime.trap("Purchase order not found") };
    purchaseOrders.remove(id);
  };

  public shared ({ caller }) func addInwardEntry(
    inwardNumber : Text,
    purchaseOrderId : Nat,
    inwardDate : Time.Time,
    materialName : Text,
    receivedQty : Nat,
    warehouse : Warehouse,
    vehicleNumber : Text,
    remarks : Text
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add inward entries");
    };

    let id = inwardEntryIdCounter;
    let entry : InwardEntry = {
      id;
      inwardNumber;
      purchaseOrderId;
      inwardDate;
      materialName;
      receivedQty;
      warehouse;
      vehicleNumber;
      remarks;
    };
    inwardEntries.add(id, entry);
    inwardEntryIdCounter += 1;

    await updateWarehouseStock(warehouse, materialName, receivedQty);

    switch (purchaseOrders.get(purchaseOrderId)) {
      case (null) { Runtime.trap("Purchase order not found") };
      case (?po) {
        let rawMaterial : RawMaterial = {
          id = rawMaterialIdCounter;
          lotNumber = inwardNumber;
          supplier = po.supplier;
          grade = materialName;
          weightKg = receivedQty;
          dateReceived = inwardDate;
          status = #available;
          warehouse;
          inwardEntryId = ?id;
        };
        rawMaterials.add(rawMaterialIdCounter, rawMaterial);
        rawMaterialIdCounter += 1;
      };
    };

    await recalculatePurchaseOrderStatus(purchaseOrderId);
    id;
  };

  public query ({ caller }) func getInwardEntry(id : Nat) : async ?InwardEntry {
    inwardEntries.get(id);
  };

  public query ({ caller }) func getAllInwardEntries() : async [InwardEntry] {
    inwardEntries.values().toArray().sort(func(a: InwardEntry, b: InwardEntry): Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getInwardEntriesByPO(purchaseOrderId : Nat) : async [InwardEntry] {
    let entries = List.empty<InwardEntry>();
    for (entry in inwardEntries.values()) {
      if (entry.purchaseOrderId == purchaseOrderId) {
        entries.add(entry);
      };
    };
    entries.toArray();
  };

  public shared ({ caller }) func deleteInwardEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete inward entries");
    };

    switch (inwardEntries.get(id)) {
      case (null) { Runtime.trap("Inward entry not found") };
      case (?entry) {
        inwardEntries.remove(id);
        await updateWarehouseStock(entry.warehouse, entry.materialName, (-Int.abs(entry.receivedQty)).toNat());
        await recalculatePurchaseOrderStatus(entry.purchaseOrderId);

        let rawMaterialIdsToRemove = List.empty<Nat>();
        let rawMaterialsIter = rawMaterials.entries();
        for ((materialId, material) in rawMaterialsIter) {
          switch (material.inwardEntryId) {
            case (?entryId) {
              if (entryId == id) {
                rawMaterialIdsToRemove.add(materialId);
              };
            };
            case (null) {};
          };
        };
        let toRemoveArray = rawMaterialIdsToRemove.toArray();
        let toRemoveIter = toRemoveArray.values();
        for (rawMatId in toRemoveIter) {
          rawMaterials.remove(rawMatId);
        };
      };
    };
  };

  public query ({ caller }) func getAllWarehouseStock() : async [WarehouseStock] {
    warehouseStock.values().toArray();
  };

  public query ({ caller }) func getNextPONumber() : async Text {
    let nextPOId = purchaseOrderIdCounter + 1;
    let formattedNum = if (nextPOId < 10) {
      "00" # nextPOId.toText();
    } else if (nextPOId < 100) {
      "0" # nextPOId.toText();
    } else {
      nextPOId.toText();
    };
    "PO-2026-" # formattedNum;
  };

  public query ({ caller }) func getNextInwardNumber() : async Text {
    let nextInwardId = inwardEntryIdCounter + 1;
    let formattedNum = if (nextInwardId < 10) {
      "00" # nextInwardId.toText();
    } else if (nextInwardId < 100) {
      "0" # nextInwardId.toText();
    } else {
      nextInwardId.toText();
    };
    "IW-2026-" # formattedNum;
  };

  public query ({ caller }) func getPOBalance(purchaseOrderId : Nat) : async ?POBalance {
    switch (purchaseOrders.get(purchaseOrderId)) {
      case (null) { null };
      case (?po) {
        var totalReceived : Nat = 0;
        for (entry in inwardEntries.values()) {
          if (entry.purchaseOrderId == purchaseOrderId) {
            totalReceived += entry.receivedQty;
          };
        };
        let balanceQty = if (totalReceived >= po.orderedQty) { 0 } else {
          po.orderedQty - totalReceived;
        };
        ?{
          orderedQty = po.orderedQty;
          receivedQty = totalReceived;
          balanceQty;
        };
      };
    };
  };

  func warehouseToText(warehouse : Warehouse) : Text {
    switch (warehouse) {
      case (#oeRawMaterial) { "oeRawMaterial" };
      case (#ringRawMaterial) { "ringRawMaterial" };
    };
  };

  func updateWarehouseStock(warehouse : Warehouse, materialName : Text, qtyChange : Nat) : async () {
    let key = warehouseToText(warehouse) # "_" # materialName;
    let current = switch (warehouseStock.get(key)) {
      case (null) {
        {
          warehouse;
          totalQty = 0;
          materialName;
        };
      };
      case (?s) { s };
    };

    let newStock = {
      current with
      totalQty =
        if (qtyChange > 0) {
          (current.totalQty + qtyChange).toNat();
        } else {
          let decreaseAmt = (-qtyChange).toNat();
          if (current.totalQty < decreaseAmt) { Runtime.trap("Not enough stock for this operation") };
          (current.totalQty - decreaseAmt);
        };
    };
    warehouseStock.add(key, newStock);
  };

  func recalculatePurchaseOrderStatus(id : Nat) : async () {
    switch (purchaseOrders.get(id)) {
      case (null) {};
      case (?po) {
        var totalReceived = 0;
        for (entry in inwardEntries.values()) {
          if (entry.purchaseOrderId == id) {
            totalReceived += entry.receivedQty;
          };
        };
        let newStatus : PurchaseOrderStatus = if (totalReceived == 0) {
          #open;
        } else if (totalReceived >= po.orderedQty) {
          #closed;
        } else {
          #partiallyReceived;
        };
        let updated = { po with status = newStatus };
        purchaseOrders.add(id, updated);
      };
    };
  };

  func prodOrderBalanceInternal(yarnCountNe : Nat, lotNumber : Text) : ?ProductionOrderBalance {
    let order : ?ProductionOrder = productionOrders.values().find(
      func(o) {
        o.yarnCountNe == yarnCountNe and o.lotNumber == lotNumber;
      }
    );

    switch (order) {
      case (null) { null };
      case (?o) {
        let producedQty : Nat = productionLogs.values().foldLeft<ProductionLog, Nat>(
          0,
          func(acc, log) {
            switch (machines.get(log.machineId)) {
              case (null) { acc };
              case (?machine) {
                switch (machine.runningCount, machine.runningLotNumber) {
                  case (?count, ?lot) {
                    acc + (if (count == yarnCountNe and lot == lotNumber) { log.quantityKg } else { 0 });
                  };
                  case (_, _) { acc };
                };
              };
            };
          },
        );

        let balanceQty : Int = o.quantityKg.toInt() - producedQty.toInt();
        ?{
          orderId = o.id;
          orderQty = o.quantityKg;
          producedQty;
          balanceQty;
          isFulfilled = balanceQty <= 0;
        };
      };
    };
  };

  public query ({ caller }) func getProductionOrderBalance(
    yarnCountNe : Nat,
    lotNumber : Text,
  ) : async ?ProductionOrderBalance {
    prodOrderBalanceInternal(yarnCountNe, lotNumber);
  };

  public query ({ caller }) func getNextProductionOrderNumber() : async Text {
    let nextPOId = productionOrderIdCounter + 1;
    let formattedNum = if (nextPOId < 10) {
      "00" # nextPOId.toText();
    } else if (nextPOId < 100) {
      "0" # nextPOId.toText();
    } else {
      nextPOId.toText();
    };
    "PO-2026-" # formattedNum;
  };
};
