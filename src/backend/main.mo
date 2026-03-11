import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // ─── Types ────────────────────────────────────────────────────────────────

  type Warehouse = { #oeRawMaterial; #ringRawMaterial };
  type RawMaterialStatus = { #available; #inUse; #consumed };
  type PurchaseOrderStatus = { #open; #partiallyReceived; #closed };
  type OrderStatus = { #pending; #inProgress; #completed; #cancelled };
  type MachineStatus = { #running; #idle; #maintenance };
  type MachineType = { #blowroom; #carding; #drawing; #combing; #roving; #ringFrame; #winding; #autocoro };
  type SpinningUnit = { #openend; #ringSpinning; #tfo };
  type ProductType = { #carded; #combed; #polyester; #bamboo; #viscose; #lt };
  type EndUse = { #warp; #weft; #pile; #ground; #tfo };
  type TwistDirection = { #s; #z };
  type Shift = { #morning; #afternoon; #night };
  type ProcessStage = { #blowroom; #carding; #drawing; #combing; #roving; #ringSpinning; #winding; #qualityCheck; #finished };
  type DispatchDestination = { #weaving; #kolhapur; #ambala; #outside; #amravati; #softWinding; #tfo };
  type InventoryStatus = { #inStock; #dispatched };

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

  type WarehouseStock = {
    warehouse : Warehouse;
    materialName : Text;
    totalQty : Nat;
  };

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

  type ProductionLog = {
    id : Nat;
    shift : Shift;
    date : Time.Time;
    machineId : Nat;
    quantityKg : Nat;
    efficiencyPercent : Nat;
    operatorName : Text;
  };

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

  type YarnInventory = {
    id : Nat;
    lotNumber : Text;
    yarnCountNe : Nat;
    twistDirection : TwistDirection;
    quantityCones : Nat;
    weightKg : Nat;
    status : InventoryStatus;
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

  type DispatchEntry = {
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

  type PackingBalance = {
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnit;
    productType : ProductType;
    endUse : EndUse;
    availableKg : Nat;
    totalPackedKg : Nat;
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

  public type UserProfile = {
    name : Text;
    role : Text;
    department : Text;
  };

  public type UserEntry = {
    principal : Principal;
    role : AccessControl.UserRole;
  };

  // ─── State ────────────────────────────────────────────────────────────────

  var rawMaterialIdCounter = 0;
  var purchaseOrderIdCounter = 0;
  var inwardEntryIdCounter = 0;
  var materialIssueIdCounter = 1;
  var productionOrderIdCounter = 0;
  var machineIdCounter = 0;
  var productionLogIdCounter = 0;
  var batchStageIdCounter = 0;
  var qualityTestIdCounter = 0;
  var yarnInventoryIdCounter = 0;
  var packingEntryIdCounter = 1;
  var dispatchEntryIdCounter = 1;
  var yarnOpeningStockIdCounter = 1;

  let rawMaterials = Map.empty<Nat, RawMaterial>();
  let purchaseOrders = Map.empty<Nat, PurchaseOrder>();
  let inwardEntries = Map.empty<Nat, InwardEntry>();
  let materialIssues = Map.empty<Nat, MaterialIssue>();
  let warehouseStock = Map.empty<Text, WarehouseStock>();
  let productionOrders = Map.empty<Nat, ProductionOrder>();
  let machines = Map.empty<Nat, Machine>();
  let productionLogs = Map.empty<Nat, ProductionLog>();
  let batches = Map.empty<Nat, BatchStage>();
  let qualityTests = Map.empty<Nat, QualityTest>();
  let yarnInventory = Map.empty<Nat, YarnInventory>();
  let packingEntries = Map.empty<Nat, PackingEntry>();
  let dispatchEntries = Map.empty<Nat, DispatchEntry>();
  let yarnOpeningStock = Map.empty<Nat, YarnOpeningStockRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let openingStockRawMaterialIds = Set.empty<Nat>();
  let openingStockYarnIds = Set.empty<Nat>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func warehouseToText(w : Warehouse) : Text {
    switch (w) {
      case (#oeRawMaterial) { "OE" };
      case (#ringRawMaterial) { "RING" };
    };
  };

  func updateWarehouseStockAdd(warehouse : Warehouse, materialName : Text, qty : Nat) {
    let key = warehouseToText(warehouse) # "_" # materialName;
    switch (warehouseStock.get(key)) {
      case (null) {
        warehouseStock.add(key, { warehouse; materialName; totalQty = qty });
      };
      case (?s) {
        warehouseStock.add(key, { s with totalQty = s.totalQty + qty });
      };
    };
  };

  // FIXED: scan ALL warehouseStock entries matching warehouse+materialName (by field, not just key)
  // This handles legacy data where stock may be spread across multiple keys due to past bugs
  func updateWarehouseStockSub(warehouse : Warehouse, materialName : Text, qty : Nat) {
    // Step 1: compute total available across ALL matching entries
    var totalAvailable : Nat = 0;
    for ((_, s) in warehouseStock.entries()) {
      if (s.warehouse == warehouse and s.materialName == materialName) {
        totalAvailable += s.totalQty;
      };
    };

    if (totalAvailable < qty) {
      Runtime.trap("Not enough stock. Available: " # (totalAvailable : Nat).toText() # " kg, Requested: " # (qty : Nat).toText() # " kg");
    };

    // Step 2: deduct - start with primary key, then other matching entries
    var remaining = qty;
    let primaryKey = warehouseToText(warehouse) # "_" # materialName;

    switch (warehouseStock.get(primaryKey)) {
      case (?s) {
        if (s.totalQty >= remaining) {
          warehouseStock.add(primaryKey, { s with totalQty = s.totalQty - remaining });
          remaining := 0;
        } else {
          remaining -= s.totalQty;
          warehouseStock.add(primaryKey, { s with totalQty = 0 });
        };
      };
      case (null) {};
    };

    if (remaining > 0) {
      for ((k, s) in warehouseStock.entries()) {
        if (remaining > 0 and k != primaryKey and s.warehouse == warehouse and s.materialName == materialName) {
          if (s.totalQty >= remaining) {
            warehouseStock.add(k, { s with totalQty = s.totalQty - remaining });
            remaining := 0;
          } else {
            remaining -= s.totalQty;
            warehouseStock.add(k, { s with totalQty = 0 });
          };
        };
      };
    };
  };

  func currentYear() : Text {
    let secs = Time.now() / 1_000_000_000;
    let secsPerYear : Int = 31_536_000;
    let yearsSince1970 : Int = secs / secsPerYear;
    let year = 1970 + yearsSince1970;
    (year : Int).toText();
  };

  func padNum(n : Nat, width : Nat) : Text {
    let s = (n : Nat).toText();
    var pad = "";
    var i = s.size();
    while (i < width) {
      pad := pad # "0";
      i += 1;
    };
    pad # s;
  };

  func requireUser(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Please sign in to save data");
    };
  };

  // ─── Auth / Users ─────────────────────────────────────────────────────────

  public query ({ caller }) func getAllUsers() : async [UserEntry] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return [];
    };
    let out = List.empty<UserEntry>();
    for ((p, r) in accessControlState.userRoles.entries()) {
      out.add({ principal = p; role = r });
    };
    out.toArray();
  };

  public shared ({ caller }) func removeUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    if (caller == user) { Runtime.trap("Cannot remove yourself") };
    accessControlState.userRoles.remove(user);
  };

  public shared ({ caller }) func updateUserRole(user : Principal, newRole : AccessControl.UserRole) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    if (caller == user) { Runtime.trap("Cannot change your own role") };
    accessControlState.userRoles.add(user, newRole);
  };

  // Grants admin to the caller if no admin exists in the system (recovery path for live deployments)
  public shared ({ caller }) func claimAdminIfNoAdminExists() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (AccessControl.hasNoAdmin(accessControlState)) {
      accessControlState.userRoles.add(caller, #admin);
      accessControlState.adminAssigned := true;
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    requireUser(caller);
    userProfiles.add(caller, profile);
  };

  // ─── Raw Materials ────────────────────────────────────────────────────────

  public query ({ caller }) func getAllRawMaterials() : async [RawMaterial] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    let out = List.empty<RawMaterial>();
    for ((_, m) in rawMaterials.entries()) { out.add(m) };
    out.toArray().sort(func(a : RawMaterial, b : RawMaterial) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addRawMaterial(lotNumber : Text, supplier : Text, grade : Text, weightKg : Nat, warehouse : Warehouse, inwardEntryId : ?Nat) : async Nat {
    requireUser(caller);
    let id = rawMaterialIdCounter;
    rawMaterials.add(id, { id; lotNumber; supplier; grade; weightKg; dateReceived = Time.now(); status = #available; warehouse; inwardEntryId });
    rawMaterialIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateRawMaterial(id : Nat, lotNumber : Text, supplier : Text, grade : Text, weightKg : Nat, status : RawMaterialStatus, warehouse : Warehouse) : async () {
    requireUser(caller);
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?m) {
        rawMaterials.add(id, { m with lotNumber; supplier; grade; weightKg; status; warehouse });
      };
    };
  };

  public shared ({ caller }) func deleteRawMaterial(id : Nat) : async () {
    requireUser(caller);
    rawMaterials.remove(id);
  };

  // ─── RM Opening Stock ─────────────────────────────────────────────────────

  public shared ({ caller }) func addRawMaterialOpeningStock(materialName : Text, supplier : Text, grade : Text, weightKg : Nat, warehouse : Warehouse, date : Time.Time) : async Nat {
    requireUser(caller);
    let id = rawMaterialIdCounter;
    let effectiveGrade = if (grade == "") { materialName } else { grade };
    rawMaterials.add(id, { id; lotNumber = materialName; supplier; grade = effectiveGrade; weightKg; dateReceived = date; status = #available; warehouse; inwardEntryId = null });
    openingStockRawMaterialIds.add(id);
    rawMaterialIdCounter += 1;
    updateWarehouseStockAdd(warehouse, materialName, weightKg);
    id;
  };

  public query ({ caller }) func getAllRawMaterialOpeningStock() : async [RawMaterial] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view opening stock");
    };
    let out = List.empty<RawMaterial>();
    for (id in openingStockRawMaterialIds.values()) {
      switch (rawMaterials.get(id)) {
        case (?m) { out.add(m) };
        case (null) {};
      };
    };
    out.toArray().sort(func(a : RawMaterial, b : RawMaterial) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func deleteRawMaterialOpeningStock(id : Nat) : async () {
    requireUser(caller);
    if (not openingStockRawMaterialIds.contains(id)) {
      Runtime.trap("Not an opening stock entry");
    };
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?m) {
        updateWarehouseStockSub(m.warehouse, m.grade, m.weightKg);
        rawMaterials.remove(id);
        openingStockRawMaterialIds.remove(id);
      };
    };
  };

  // ─── Warehouse Stock ──────────────────────────────────────────────────────

  public query ({ caller }) func getAllWarehouseStock() : async [WarehouseStock] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view warehouse stock");
    };
    let out = List.empty<WarehouseStock>();
    for ((_, s) in warehouseStock.entries()) {
      if (s.totalQty > 0) { out.add(s) };
    };
    out.toArray();
  };

  // ─── Purchase Orders ──────────────────────────────────────────────────────

  public query ({ caller }) func getAllPurchaseOrders() : async [PurchaseOrder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view purchase orders");
    };
    let out = List.empty<PurchaseOrder>();
    for ((_, po) in purchaseOrders.entries()) { out.add(po) };
    out.toArray().sort(func(a : PurchaseOrder, b : PurchaseOrder) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextPONumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "PO-" # currentYear() # "-" # padNum(purchaseOrderIdCounter + 1, 3);
  };

  public shared ({ caller }) func createPurchaseOrder(poNumber : Text, supplier : Text, materialName : Text, orderedQty : Nat, orderDate : Time.Time, expectedDeliveryDate : Time.Time) : async Nat {
    requireUser(caller);
    let id = purchaseOrderIdCounter;
    purchaseOrders.add(id, { id; poNumber; supplier; materialName; orderedQty; orderDate; expectedDeliveryDate; status = #open });
    purchaseOrderIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updatePurchaseOrder(id : Nat, poNumber : Text, supplier : Text, materialName : Text, orderedQty : Nat, orderDate : Time.Time, expectedDeliveryDate : Time.Time) : async () {
    requireUser(caller);
    switch (purchaseOrders.get(id)) {
      case (null) { Runtime.trap("Purchase order not found") };
      case (?po) {
        purchaseOrders.add(id, { po with poNumber; supplier; materialName; orderedQty; orderDate; expectedDeliveryDate });
      };
    };
  };

  public shared ({ caller }) func deletePurchaseOrder(id : Nat) : async () {
    requireUser(caller);
    purchaseOrders.remove(id);
  };

  public query ({ caller }) func getPOBalance(purchaseOrderId : Nat) : async ?POBalance {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view PO balance");
    };
    switch (purchaseOrders.get(purchaseOrderId)) {
      case (null) { null };
      case (?po) {
        var received : Nat = 0;
        for ((_, ie) in inwardEntries.entries()) {
          if (ie.purchaseOrderId == purchaseOrderId) {
            received += ie.receivedQty;
          };
        };
        let balance : Nat = if (po.orderedQty > received) { po.orderedQty - received } else { 0 };
        ?{ orderedQty = po.orderedQty; receivedQty = received; balanceQty = balance };
      };
    };
  };

  // ─── Inward Entries ───────────────────────────────────────────────────────

  public query ({ caller }) func getAllInwardEntries() : async [InwardEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view inward entries");
    };
    let out = List.empty<InwardEntry>();
    for ((_, ie) in inwardEntries.entries()) { out.add(ie) };
    out.toArray().sort(func(a : InwardEntry, b : InwardEntry) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextInwardNumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "IW-" # currentYear() # "-" # padNum(inwardEntryIdCounter + 1, 3);
  };

  public shared ({ caller }) func addInwardEntry(inwardNumber : Text, purchaseOrderId : Nat, inwardDate : Time.Time, materialName : Text, receivedQty : Nat, warehouse : Warehouse, vehicleNumber : Text, remarks : Text) : async Nat {
    requireUser(caller);
    let id = inwardEntryIdCounter;
    inwardEntries.add(id, { id; inwardNumber; purchaseOrderId; inwardDate; materialName; receivedQty; warehouse; vehicleNumber; remarks });
    inwardEntryIdCounter += 1;

    // Create raw material record
    let rmId = rawMaterialIdCounter;
    let inwardSupplier = switch (purchaseOrders.get(purchaseOrderId)) { case (?po) { po.supplier }; case (null) { "" } };
    rawMaterials.add(rmId, { id = rmId; lotNumber = inwardNumber; supplier = inwardSupplier; grade = materialName; weightKg = receivedQty; dateReceived = inwardDate; status = #available; warehouse; inwardEntryId = ?id });
    rawMaterialIdCounter += 1;

    // Update warehouse stock
    updateWarehouseStockAdd(warehouse, materialName, receivedQty);

    // Update PO status
    switch (purchaseOrders.get(purchaseOrderId)) {
      case (null) {};
      case (?po) {
        var totalReceived : Nat = 0;
        for ((_, ie) in inwardEntries.entries()) {
          if (ie.purchaseOrderId == purchaseOrderId) {
            totalReceived += ie.receivedQty;
          };
        };
        let newStatus : PurchaseOrderStatus = if (totalReceived >= po.orderedQty) { #closed } else { #partiallyReceived };
        purchaseOrders.add(purchaseOrderId, { po with status = newStatus });
      };
    };

    id;
  };

  public shared ({ caller }) func deleteInwardEntry(id : Nat) : async () {
    requireUser(caller);
    switch (inwardEntries.get(id)) {
      case (null) { Runtime.trap("Inward entry not found") };
      case (?ie) {
        // Reverse warehouse stock
        updateWarehouseStockSub(ie.warehouse, ie.materialName, ie.receivedQty);
        // Remove associated raw material
        let toRemove = List.empty<Nat>();
        for ((rmId, rm) in rawMaterials.entries()) {
          switch (rm.inwardEntryId) {
            case (?eid) { if (eid == id) { toRemove.add(rmId) } };
            case (null) {};
          };
        };
        for (rmId in toRemove.values()) { rawMaterials.remove(rmId) };
        inwardEntries.remove(id);
        // Revert PO status
        switch (purchaseOrders.get(ie.purchaseOrderId)) {
          case (null) {};
          case (?po) {
            var totalReceived : Nat = 0;
            for ((_, ie2) in inwardEntries.entries()) {
              if (ie2.purchaseOrderId == ie.purchaseOrderId) {
                totalReceived += ie2.receivedQty;
              };
            };
            let newStatus : PurchaseOrderStatus = if (totalReceived == 0) { #open } else if (totalReceived >= po.orderedQty) { #closed } else { #partiallyReceived };
            purchaseOrders.add(ie.purchaseOrderId, { po with status = newStatus });
          };
        };
      };
    };
  };

  // ─── Material Issues ──────────────────────────────────────────────────────

  public query ({ caller }) func getAllMaterialIssues() : async [MaterialIssue] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view material issues");
    };
    let out = List.empty<MaterialIssue>();
    for ((_, mi) in materialIssues.entries()) { out.add(mi) };
    out.toArray().sort(func(a : MaterialIssue, b : MaterialIssue) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextIssueNumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "ISS-" # currentYear() # "-" # padNum(materialIssueIdCounter, 3);
  };

  // FIXED createMaterialIssue: compute total available across ALL warehouseStock entries
  // matching warehouse+materialName (by field value), not just a single key lookup
  public shared ({ caller }) func createMaterialIssue(department : Text, warehouse : Warehouse, materialName : Text, grade : Text, issuedQty : Nat, remarks : Text) : async Nat {
    requireUser(caller);

    var available : Nat = 0;
    for ((_, s) in warehouseStock.entries()) {
      if (s.warehouse == warehouse and s.materialName == materialName) {
        available += s.totalQty;
      };
    };

    if (available < issuedQty) {
      Runtime.trap("Not enough stock. Available: " # (available : Nat).toText() # " kg, Requested: " # (issuedQty : Nat).toText() # " kg");
    };

    updateWarehouseStockSub(warehouse, materialName, issuedQty);

    let id = materialIssueIdCounter;
    let issueNumber = "ISS-" # currentYear() # "-" # padNum(id, 3);
    materialIssues.add(id, { id; issueNumber; issueDate = Time.now(); department; warehouse; materialName; grade; issuedQty; remarks });
    materialIssueIdCounter += 1;
    id;
  };

  public shared ({ caller }) func deleteMaterialIssue(id : Nat) : async () {
    requireUser(caller);
    switch (materialIssues.get(id)) {
      case (null) { Runtime.trap("Material issue not found") };
      case (?mi) {
        updateWarehouseStockAdd(mi.warehouse, mi.materialName, mi.issuedQty);
        materialIssues.remove(id);
      };
    };
  };

  // ─── Production Orders ────────────────────────────────────────────────────

  public query ({ caller }) func getAllProductionOrders() : async [ProductionOrder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production orders");
    };
    let out = List.empty<ProductionOrder>();
    for ((_, po) in productionOrders.entries()) { out.add(po) };
    out.toArray().sort(func(a : ProductionOrder, b : ProductionOrder) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextProductionOrderNumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "ORD-" # currentYear() # "-" # padNum(productionOrderIdCounter + 1, 3);
  };

  public shared ({ caller }) func createProductionOrder(orderNumber : Text, lotNumber : Text, productType : ProductType, spinningUnit : SpinningUnit, endUse : EndUse, yarnCountNe : Nat, twistDirection : TwistDirection, quantityKg : Nat, targetDate : Time.Time, status : OrderStatus) : async Nat {
    requireUser(caller);
    let id = productionOrderIdCounter;
    productionOrders.add(id, { id; orderNumber; lotNumber; productType; spinningUnit; endUse; yarnCountNe; twistDirection; quantityKg; targetDate; status });
    productionOrderIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateProductionOrder(id : Nat, orderNumber : Text, lotNumber : Text, productType : ProductType, spinningUnit : SpinningUnit, endUse : EndUse, yarnCountNe : Nat, twistDirection : TwistDirection, quantityKg : Nat, targetDate : Time.Time, status : OrderStatus) : async () {
    requireUser(caller);
    switch (productionOrders.get(id)) {
      case (null) { Runtime.trap("Production order not found") };
      case (?po) {
        productionOrders.add(id, { po with orderNumber; lotNumber; productType; spinningUnit; endUse; yarnCountNe; twistDirection; quantityKg; targetDate; status });
      };
    };
  };

  public shared ({ caller }) func deleteProductionOrder(id : Nat) : async () {
    requireUser(caller);
    productionOrders.remove(id);
  };

  public query ({ caller }) func getProductionOrderBalance(yarnCountNe : Nat, lotNumber : Text) : async ?ProductionOrderBalance {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production order balance");
    };
    var found : ?ProductionOrder = null;
    for ((_, po) in productionOrders.entries()) {
      if (po.status == #inProgress and po.lotNumber == lotNumber) {
        found := ?po;
      };
    };
    switch (found) {
      case (null) { null };
      case (?order) {
        // Collect all machine IDs whose runningLotNumber matches this lot
        let matchingMachineIds = Set.empty<Nat>();
        for ((_, m) in machines.entries()) {
          switch (m.runningLotNumber) {
            case (?rln) {
              if (rln == lotNumber) {
                matchingMachineIds.add(m.id);
              };
            };
            case (null) {};
          };
        };
        // Sum production logs for all machines running this lot
        var produced : Nat = 0;
        for ((_, log) in productionLogs.entries()) {
          if (matchingMachineIds.contains(log.machineId)) {
            produced += log.quantityKg;
          };
        };
        let balance : Int = (order.quantityKg : Int) - (produced : Int);
        let isFulfilled = produced >= order.quantityKg;
        ?{ orderId = order.id; orderQty = order.quantityKg; producedQty = produced; balanceQty = balance; isFulfilled };
      };
    };
  };

  // ─── Machines ─────────────────────────────────────────────────────────────

  public query ({ caller }) func getAllMachines() : async [Machine] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    let out = List.empty<Machine>();
    for ((_, m) in machines.entries()) { out.add(m) };
    out.toArray().sort(func(a : Machine, b : Machine) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func registerMachine(name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat, runningCount : ?Nat, runningLotNumber : ?Text) : async Nat {
    requireUser(caller);
    let id = machineIdCounter;
    let maintenanceStartTime : ?Time.Time = switch (status) {
      case (#maintenance) { ?Time.now() };
      case (_) { null };
    };
    machines.add(id, { id; name; machineType; machineNumber; status; currentOrderId; runningCount; runningLotNumber; maintenanceStartTime; totalMaintenanceDurationMins = 0 });
    machineIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateMachine(id : Nat, name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat, runningCount : ?Nat, runningLotNumber : ?Text) : async () {
    requireUser(caller);
    switch (machines.get(id)) {
      case (null) { Runtime.trap("Machine not found") };
      case (?m) {
        let now = Time.now();
        var totalMins = m.totalMaintenanceDurationMins;
        let newMaintenanceStart : ?Time.Time = switch (status) {
          case (#maintenance) {
            switch (m.status) {
              case (#maintenance) { m.maintenanceStartTime };
              case (_) { ?now };
            };
          };
          case (_) {
            switch (m.status) {
              case (#maintenance) {
                switch (m.maintenanceStartTime) {
                  case (?startTime) {
                    let elapsed : Int = (now - startTime) / 60_000_000_000;
                    totalMins += if (elapsed > 0) { Int.abs(elapsed) } else { 0 };
                  };
                  case (null) {};
                };
                null;
              };
              case (_) { null };
            };
          };
        };
        machines.add(id, { m with name; machineType; machineNumber; status; currentOrderId; runningCount; runningLotNumber; maintenanceStartTime = newMaintenanceStart; totalMaintenanceDurationMins = totalMins });
      };
    };
  };

  public shared ({ caller }) func deleteMachine(id : Nat) : async () {
    requireUser(caller);
    machines.remove(id);
  };

  // ─── Production Logs ──────────────────────────────────────────────────────

  public query ({ caller }) func getAllProductionLogs() : async [ProductionLog] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production logs");
    };
    let out = List.empty<ProductionLog>();
    for ((_, pl) in productionLogs.entries()) { out.add(pl) };
    out.toArray().sort(func(a : ProductionLog, b : ProductionLog) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addProductionLog(shift : Shift, date : Time.Time, machineId : Nat, quantityKg : Nat, efficiencyPercent : Nat, operatorName : Text) : async Nat {
    requireUser(caller);
    let id = productionLogIdCounter;
    productionLogs.add(id, { id; shift; date; machineId; quantityKg; efficiencyPercent; operatorName });
    productionLogIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateProductionLog(id : Nat, shift : Shift, date : Time.Time, machineId : Nat, quantityKg : Nat, efficiencyPercent : Nat, operatorName : Text) : async () {
    requireUser(caller);
    switch (productionLogs.get(id)) {
      case (null) { Runtime.trap("Production log not found") };
      case (?pl) {
        productionLogs.add(id, { pl with shift; date; machineId; quantityKg; efficiencyPercent; operatorName });
      };
    };
  };

  public shared ({ caller }) func deleteProductionLog(id : Nat) : async () {
    requireUser(caller);
    productionLogs.remove(id);
  };

  // ─── Batch Stages ─────────────────────────────────────────────────────────

  public query ({ caller }) func getAllBatchStages() : async [BatchStage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view batch stages");
    };
    let out = List.empty<BatchStage>();
    for ((_, b) in batches.entries()) { out.add(b) };
    out.toArray().sort(func(a : BatchStage, b : BatchStage) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addBatchStage(batchId : Nat, stage : ProcessStage, weightInKg : Nat, weightOutKg : Nat, machineId : Nat, startTime : Time.Time, endTime : Time.Time, operatorNotes : Text) : async Nat {
    requireUser(caller);
    let id = batchStageIdCounter;
    batches.add(id, { id; batchId; stage; weightInKg; weightOutKg; machineId; startTime; endTime; operatorNotes });
    batchStageIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateBatchStage(id : Nat, batchId : Nat, stage : ProcessStage, weightInKg : Nat, weightOutKg : Nat, machineId : Nat, startTime : Time.Time, endTime : Time.Time, operatorNotes : Text) : async () {
    requireUser(caller);
    switch (batches.get(id)) {
      case (null) { Runtime.trap("Batch stage not found") };
      case (?b) {
        batches.add(id, { b with batchId; stage; weightInKg; weightOutKg; machineId; startTime; endTime; operatorNotes });
      };
    };
  };

  public shared ({ caller }) func deleteBatchStage(id : Nat) : async () {
    requireUser(caller);
    batches.remove(id);
  };

  // ─── Quality Tests ────────────────────────────────────────────────────────

  public query ({ caller }) func getAllQualityTests() : async [QualityTest] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view quality tests");
    };
    let out = List.empty<QualityTest>();
    for ((_, qt) in qualityTests.entries()) { out.add(qt) };
    out.toArray().sort(func(a : QualityTest, b : QualityTest) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addQualityTest(batchId : Nat, csp : Nat, elongationPercent : Nat, evennessPercent : Nat, thinPlaces : Nat, thickPlaces : Nat, neps : Nat, hairinessIndex : Nat, pass : Bool) : async Nat {
    requireUser(caller);
    let id = qualityTestIdCounter;
    qualityTests.add(id, { id; batchId; csp; elongationPercent; evennessPercent; thinPlaces; thickPlaces; neps; hairinessIndex; pass });
    qualityTestIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateQualityTest(id : Nat, batchId : Nat, csp : Nat, elongationPercent : Nat, evennessPercent : Nat, thinPlaces : Nat, thickPlaces : Nat, neps : Nat, hairinessIndex : Nat, pass : Bool) : async () {
    requireUser(caller);
    switch (qualityTests.get(id)) {
      case (null) { Runtime.trap("Quality test not found") };
      case (?qt) {
        qualityTests.add(id, { qt with batchId; csp; elongationPercent; evennessPercent; thinPlaces; thickPlaces; neps; hairinessIndex; pass });
      };
    };
  };

  public shared ({ caller }) func deleteQualityTest(id : Nat) : async () {
    requireUser(caller);
    qualityTests.remove(id);
  };

  // ─── Yarn Inventory (legacy) ──────────────────────────────────────────────

  public query ({ caller }) func getAllYarnInventory() : async [YarnInventory] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view yarn inventory");
    };
    let out = List.empty<YarnInventory>();
    for ((_, yi) in yarnInventory.entries()) { out.add(yi) };
    out.toArray().sort(func(a : YarnInventory, b : YarnInventory) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addYarnInventory(lotNumber : Text, yarnCountNe : Nat, twistDirection : TwistDirection, quantityCones : Nat, weightKg : Nat, status : InventoryStatus) : async Nat {
    requireUser(caller);
    let id = yarnInventoryIdCounter;
    yarnInventory.add(id, { id; lotNumber; yarnCountNe; twistDirection; quantityCones; weightKg; status });
    yarnInventoryIdCounter += 1;
    id;
  };

  public shared ({ caller }) func updateYarnInventory(id : Nat, lotNumber : Text, yarnCountNe : Nat, twistDirection : TwistDirection, quantityCones : Nat, weightKg : Nat, status : InventoryStatus) : async () {
    requireUser(caller);
    switch (yarnInventory.get(id)) {
      case (null) { Runtime.trap("Yarn inventory not found") };
      case (?yi) {
        yarnInventory.add(id, { yi with lotNumber; yarnCountNe; twistDirection; quantityCones; weightKg; status });
      };
    };
  };

  public shared ({ caller }) func deleteYarnInventory(id : Nat) : async () {
    requireUser(caller);
    yarnInventory.remove(id);
  };

  // ─── Yarn Opening Stock ───────────────────────────────────────────────────

  public query ({ caller }) func getAllYarnOpeningStock() : async [YarnOpeningStockRecord] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view yarn opening stock");
    };
    let out = List.empty<YarnOpeningStockRecord>();
    for ((_, r) in yarnOpeningStock.entries()) { out.add(r) };
    out.toArray().sort(func(a : YarnOpeningStockRecord, b : YarnOpeningStockRecord) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func addYarnOpeningStock(lotNumber : Text, yarnCountNe : Nat, spinningUnit : SpinningUnit, productType : ProductType, endUse : EndUse, weightKg : Nat) : async Nat {
    requireUser(caller);
    let id = yarnOpeningStockIdCounter;
    yarnOpeningStock.add(id, { id; lotNumber; yarnCountNe; spinningUnit; productType; endUse; weightKg; createdAt = Time.now() });
    openingStockYarnIds.add(id);
    yarnOpeningStockIdCounter += 1;
    id;
  };

  public shared ({ caller }) func deleteYarnOpeningStock(id : Nat) : async () {
    requireUser(caller);
    if (not openingStockYarnIds.contains(id)) {
      Runtime.trap("Yarn opening stock entry not found");
    };
    yarnOpeningStock.remove(id);
    openingStockYarnIds.remove(id);
  };

  // ─── Packing Entries ──────────────────────────────────────────────────────

  public query ({ caller }) func getAllPackingEntries() : async [PackingEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view packing entries");
    };
    let out = List.empty<PackingEntry>();
    for ((_, pe) in packingEntries.entries()) { out.add(pe) };
    out.toArray().sort(func(a : PackingEntry, b : PackingEntry) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextPackingNumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "PKG-" # currentYear() # "-" # padNum(packingEntryIdCounter, 3);
  };

  public query ({ caller }) func getPackingBalance(lotNumber : Text) : async ?PackingBalance {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view packing balance");
    };
    var order : ?ProductionOrder = null;
    for ((_, po) in productionOrders.entries()) {
      if (po.lotNumber == lotNumber) { order := ?po };
    };
    switch (order) {
      case (null) { null };
      case (?o) {
        // Total produced for this lot (sum production logs for machines running this lot)
        var produced : Nat = 0;
        for ((_, m) in machines.entries()) {
          switch (m.runningLotNumber) {
            case (?rln) {
              if (rln == lotNumber) {
                for ((_, pl) in productionLogs.entries()) {
                  if (pl.machineId == m.id) { produced += pl.quantityKg };
                };
              };
            };
            case (null) {};
          };
        };
        // Also count opening stock yarn for this lot
        for ((_, yr) in yarnOpeningStock.entries()) {
          if (yr.lotNumber == lotNumber) { produced += yr.weightKg };
        };
        var packed : Nat = 0;
        for ((_, pe) in packingEntries.entries()) {
          if (pe.lotNumber == lotNumber) { packed += pe.quantityKg };
        };
        let available : Nat = if (produced > packed) { produced - packed } else { 0 };
        ?{ lotNumber; yarnCountNe = o.yarnCountNe; spinningUnit = o.spinningUnit; productType = o.productType; endUse = o.endUse; availableKg = available; totalPackedKg = packed };
      };
    };
  };

  public shared ({ caller }) func createPackingEntry(lotNumber : Text, quantityKg : Nat, remarks : Text, packingDate : Time.Time) : async Nat {
    requireUser(caller);
    // Find production order for this lot
    var order : ?ProductionOrder = null;
    for ((_, po) in productionOrders.entries()) {
      if (po.lotNumber == lotNumber) { order := ?po };
    };
    let o = switch (order) {
      case (null) { Runtime.trap("No production order found for lot " # lotNumber) };
      case (?o) { o };
    };
    // Calculate available
    var produced : Nat = 0;
    for ((_, m) in machines.entries()) {
      switch (m.runningLotNumber) {
        case (?rln) {
          if (rln == lotNumber) {
            for ((_, pl) in productionLogs.entries()) {
              if (pl.machineId == m.id) { produced += pl.quantityKg };
            };
          };
        };
        case (null) {};
      };
    };
    for ((_, yr) in yarnOpeningStock.entries()) {
      if (yr.lotNumber == lotNumber) { produced += yr.weightKg };
    };
    var alreadyPacked : Nat = 0;
    for ((_, pe) in packingEntries.entries()) {
      if (pe.lotNumber == lotNumber) { alreadyPacked += pe.quantityKg };
    };
    let available : Nat = if (produced > alreadyPacked) { produced - alreadyPacked } else { 0 };
    if (quantityKg > available) {
      Runtime.trap("Exceeds available quantity. Available: " # (available : Nat).toText() # " kg, Requested: " # (quantityKg : Nat).toText() # " kg");
    };
    let id = packingEntryIdCounter;
    let packingNumber = "PKG-" # currentYear() # "-" # padNum(id, 3);
    packingEntries.add(id, { id; packingNumber; packingDate; lotNumber; yarnCountNe = o.yarnCountNe; spinningUnit = o.spinningUnit; productType = o.productType; endUse = o.endUse; quantityKg; remarks });
    packingEntryIdCounter += 1;
    id;
  };

  public shared ({ caller }) func deletePackingEntry(id : Nat) : async () {
    requireUser(caller);
    packingEntries.remove(id);
  };

  // ─── Dispatch Entries ─────────────────────────────────────────────────────

  public query ({ caller }) func getAllDispatchEntries() : async [DispatchEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view dispatch entries");
    };
    let out = List.empty<DispatchEntry>();
    for ((_, de) in dispatchEntries.entries()) { out.add(de) };
    out.toArray().sort(func(a : DispatchEntry, b : DispatchEntry) : Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getNextDispatchNumber() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access this function");
    };
    "DSP-" # currentYear() # "-" # padNum(dispatchEntryIdCounter, 3);
  };

  public query ({ caller }) func getDispatchBalance(lotNumber : Text) : async ?DispatchBalance {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view dispatch balance");
    };
    var packed : Nat = 0;
    var yarnCountNe : Nat = 0;
    var spinningUnit : SpinningUnit = #openend;
    var productType : ProductType = #carded;
    var endUse : EndUse = #warp;
    var foundPacking = false;
    for ((_, pe) in packingEntries.entries()) {
      if (pe.lotNumber == lotNumber) {
        packed += pe.quantityKg;
        yarnCountNe := pe.yarnCountNe;
        spinningUnit := pe.spinningUnit;
        productType := pe.productType;
        endUse := pe.endUse;
        foundPacking := true;
      };
    };
    // Also check opening stock
    for ((_, yr) in yarnOpeningStock.entries()) {
      if (yr.lotNumber == lotNumber) {
        packed += yr.weightKg;
        yarnCountNe := yr.yarnCountNe;
        spinningUnit := yr.spinningUnit;
        productType := yr.productType;
        endUse := yr.endUse;
        foundPacking := true;
      };
    };
    if (not foundPacking) { return null };
    var dispatched : Nat = 0;
    for ((_, de) in dispatchEntries.entries()) {
      if (de.lotNumber == lotNumber) { dispatched += de.quantityKg };
    };
    let available : Nat = if (packed > dispatched) { packed - dispatched } else { 0 };
    ?{ lotNumber; yarnCountNe; spinningUnit; productType; endUse; totalPackedKg = packed; totalDispatchedKg = dispatched; availableKg = available };
  };

  public shared ({ caller }) func createDispatchEntry(lotNumber : Text, destination : DispatchDestination, quantityKg : Nat, dispatchDate : Time.Time, remarks : Text) : async Nat {
    requireUser(caller);
    // Validate balance
    var packed : Nat = 0;
    var yarnCountNe : Nat = 0;
    var spinningUnit : SpinningUnit = #openend;
    var productType : ProductType = #carded;
    var endUse : EndUse = #warp;
    var foundPacking = false;
    for ((_, pe) in packingEntries.entries()) {
      if (pe.lotNumber == lotNumber) {
        packed += pe.quantityKg;
        yarnCountNe := pe.yarnCountNe;
        spinningUnit := pe.spinningUnit;
        productType := pe.productType;
        endUse := pe.endUse;
        foundPacking := true;
      };
    };
    for ((_, yr) in yarnOpeningStock.entries()) {
      if (yr.lotNumber == lotNumber) {
        packed += yr.weightKg;
        yarnCountNe := yr.yarnCountNe;
        spinningUnit := yr.spinningUnit;
        productType := yr.productType;
        endUse := yr.endUse;
        foundPacking := true;
      };
    };
    if (not foundPacking) {
      Runtime.trap("No packing entries found for lot " # lotNumber);
    };
    var alreadyDispatched : Nat = 0;
    for ((_, de) in dispatchEntries.entries()) {
      if (de.lotNumber == lotNumber) { alreadyDispatched += de.quantityKg };
    };
    let available : Nat = if (packed > alreadyDispatched) { packed - alreadyDispatched } else { 0 };
    if (quantityKg > available) {
      Runtime.trap("Exceeds available quantity. Available: " # (available : Nat).toText() # " kg, Requested: " # (quantityKg : Nat).toText() # " kg");
    };
    let id = dispatchEntryIdCounter;
    let dispatchNumber = "DSP-" # currentYear() # "-" # padNum(id, 3);
    dispatchEntries.add(id, { id; dispatchNumber; dispatchDate; lotNumber; destination; quantityKg; yarnCountNe; spinningUnit; productType; endUse; remarks });
    dispatchEntryIdCounter += 1;
    id;
  };

  public shared ({ caller }) func deleteDispatchEntry(id : Nat) : async () {
    requireUser(caller);
    dispatchEntries.remove(id);
  };

  // ─── Dashboard ────────────────────────────────────────────────────────────

  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view dashboard stats");
    };
    var totalActiveOrders : Nat = 0;
    for ((_, po) in productionOrders.entries()) {
      if (po.status == #inProgress) { totalActiveOrders += 1 };
    };
    var totalMachinesRunning : Nat = 0;
    for ((_, m) in machines.entries()) {
      if (m.status == #running) { totalMachinesRunning += 1 };
    };
    var totalRawMaterial : Nat = 0;
    var oeStock : Nat = 0;
    var ringStock : Nat = 0;
    for ((_, s) in warehouseStock.entries()) {
      totalRawMaterial += s.totalQty;
      switch (s.warehouse) {
        case (#oeRawMaterial) { oeStock += s.totalQty };
        case (#ringRawMaterial) { ringStock += s.totalQty };
      };
    };
    var totalYarnWeight : Nat = 0;
    for ((_, pe) in packingEntries.entries()) { totalYarnWeight += pe.quantityKg };
    for ((_, yr) in yarnOpeningStock.entries()) { totalYarnWeight += yr.weightKg };
    var dispatchedToday : Nat = 0;
    var inwardToday : Nat = 0;
    let todayStart = Time.now() - 86_400_000_000_000;
    for ((_, de) in dispatchEntries.entries()) {
      if (de.dispatchDate >= todayStart) { dispatchedToday += de.quantityKg };
    };
    for ((_, ie) in inwardEntries.entries()) {
      if (ie.inwardDate >= todayStart) { inwardToday += ie.receivedQty };
    };
    {
      totalActiveOrders;
      totalMachinesRunning;
      totalRawMaterialWeightAvailable = totalRawMaterial;
      totalYarnInventoryWeight = totalYarnWeight;
      recentQualityTestPassRate = 0;
      totalInwardTodayKg = inwardToday;
      oeWarehouseStockKg = oeStock;
      ringWarehouseStockKg = ringStock;
      totalDispatchedTodayKg = dispatchedToday;
    };
  };
};
