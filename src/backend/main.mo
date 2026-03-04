import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
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
    yarnCountNe : Nat;
    twistDirection : TwistDirection;
    quantityKg : Nat;
    targetDate : Time.Time;
    status : OrderStatus;
  };

  type ProductType = { #carded; #combed };
  type TwistDirection = { #s; #z };
  type OrderStatus = { #pending; #inProgress; #completed; #cancelled };

  type Machine = {
    id : Nat;
    name : Text;
    machineType : MachineType;
    machineNumber : Text;
    status : MachineStatus;
    currentOrderId : ?Nat;
  };

  type MachineType = {
    #blowroom;
    #carding;
    #drawing;
    #combing;
    #roving;
    #ringFrame;
    #winding;
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

  type Warehouse = {
    #oeRawMaterial;
    #ringRawMaterial;
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

  // --- State ---
  var rawMaterialIdCounter = 0;
  var productionOrderIdCounter = 0;
  var machineIdCounter = 0;
  var batchStageIdCounter = 0;
  var qualityTestIdCounter = 0;
  var productionLogIdCounter = 0;
  var yarnInventoryIdCounter = 0;
  var purchaseOrderIdCounter = 0;
  var inwardEntryIdCounter = 0;

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

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // --- USER PROFILE ---
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
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

  // --- RAW MATERIALS ---
  public shared ({ caller }) func addRawMaterial(
    lotNumber : Text,
    supplier : Text,
    grade : Text,
    weightKg : Nat,
    warehouse : Warehouse,
    inwardEntryId : ?Nat,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    rawMaterials.get(id);
  };

  public query ({ caller }) func getAllRawMaterials() : async [RawMaterial] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
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

  // --- PRODUCTION ORDERS ---
  public shared ({ caller }) func createProductionOrder(
    orderNumber : Text,
    lotNumber : Text,
    productType : ProductType,
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view production orders");
    };
    productionOrders.get(id);
  };

  public query ({ caller }) func getAllProductionOrders() : async [ProductionOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view production orders");
    };
    productionOrders.values().toArray().sort(func(a: ProductionOrder, b: ProductionOrder): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateProductionOrder(
    id : Nat,
    orderNumber : Text,
    lotNumber : Text,
    productType : ProductType,
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

  // --- MACHINES ---
  public shared ({ caller }) func registerMachine(name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register machines");
    };
    let id = machineIdCounter;
    let machine : Machine = {
      id;
      name;
      machineType;
      machineNumber;
      status;
      currentOrderId;
    };
    machines.add(id, machine);
    machineIdCounter += 1;
    id;
  };

  public query ({ caller }) func getMachine(id : Nat) : async ?Machine {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    machines.get(id);
  };

  public query ({ caller }) func getAllMachines() : async [Machine] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    machines.values().toArray().sort(func(a: Machine, b: Machine): Order.Order { Nat.compare(a.id, b.id) });
  };

  public shared ({ caller }) func updateMachine(id : Nat, name : Text, machineType : MachineType, machineNumber : Text, status : MachineStatus, currentOrderId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update machines");
    };
    switch (machines.get(id)) {
      case (null) { Runtime.trap("Machine not found") };
      case (?_) {
        let updated : Machine = {
          id;
          name;
          machineType;
          machineNumber;
          status;
          currentOrderId;
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

  // --- BATCH STAGES ---
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view batch stages");
    };
    batches.get(id);
  };

  public query ({ caller }) func getAllBatchStages() : async [BatchStage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view batch stages");
    };
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

  // --- QUALITY TESTS ---
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view quality tests");
    };
    qualityTests.get(id);
  };

  public query ({ caller }) func getAllQualityTests() : async [QualityTest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view quality tests");
    };
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

  // --- PRODUCTION LOGS ---
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
    id;
  };

  public query ({ caller }) func getProductionLog(id : Nat) : async ?ProductionLog {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view production logs");
    };
    productionLogs.get(id);
  };

  public query ({ caller }) func getAllProductionLogs() : async [ProductionLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view production logs");
    };
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
    if (not productionLogs.containsKey(id)) { Runtime.trap("Production log not found") };
    productionLogs.remove(id);
  };

  // --- YARN INVENTORY ---
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view yarn inventory");
    };
    yarnInventory.get(id);
  };

  public query ({ caller }) func getAllYarnInventory() : async [YarnInventory] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view yarn inventory");
    };
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

  // --- DASHBOARD STATS WITH NEW FIELDS ---
  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view dashboard stats");
    };
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

    let recentQualityTestPassRate = if (totalTests > 0) {
      (passedTests * 100) / totalTests;
    } else {
      0;
    };

    let today = Time.now();
    let oneDayNanos = 86_400_000_000_000;

    // Calculate totalInwardTodayKg
    var totalInwardTodayKg = 0;
    for (inward in inwardEntries.values()) {
      if (today - inward.inwardDate < oneDayNanos) {
        totalInwardTodayKg += inward.receivedQty;
      };
    };

    // Calculate warehouse stock
    var oeWarehouseStockKg = 0;
    var ringWarehouseStockKg = 0;
    for (stock in warehouseStock.values()) {
      switch (stock.warehouse) {
        case (#oeRawMaterial) { oeWarehouseStockKg += stock.totalQty };
        case (#ringRawMaterial) { ringWarehouseStockKg += stock.totalQty };
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
    };
  };

  // --- PURCHASE ORDERS ---
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view purchase orders");
    };
    purchaseOrders.get(id);
  };

  public query ({ caller }) func getAllPurchaseOrders() : async [PurchaseOrder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view purchase orders");
    };
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
          status = #open; // will be recalculated
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

  // --- INWARD ENTRIES ---
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

    // Automatically create raw material record
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inward entries");
    };
    inwardEntries.get(id);
  };

  public query ({ caller }) func getAllInwardEntries() : async [InwardEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inward entries");
    };
    inwardEntries.values().toArray().sort(func(a: InwardEntry, b: InwardEntry): Order.Order { Nat.compare(a.id, b.id) });
  };

  public query ({ caller }) func getInwardEntriesByPO(purchaseOrderId : Nat) : async [InwardEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inward entries");
    };
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
        await updateWarehouseStock(entry.warehouse, entry.materialName, -entry.receivedQty : Int);
        await recalculatePurchaseOrderStatus(entry.purchaseOrderId);

        // Find and delete raw material with matching inwardEntryId
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view warehouse stock");
    };
    warehouseStock.values().toArray();
  };

  // --- Helper Functions ---
  func warehouseToText(warehouse : Warehouse) : Text {
    switch (warehouse) {
      case (#oeRawMaterial) { "oeRawMaterial" };
      case (#ringRawMaterial) { "ringRawMaterial" };
    };
  };

  func updateWarehouseStock(warehouse : Warehouse, materialName : Text, qtyChange : Int) : async () {
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
};
