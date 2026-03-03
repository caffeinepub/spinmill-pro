import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Int "mo:core/Int";
import List "mo:core/List";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Custom Types
  type RawMaterial = {
    id : Nat;
    lotNumber : Text;
    supplier : Text;
    grade : Text;
    weightKg : Nat;
    dateReceived : Time.Time;
    status : RawMaterialStatus;
  };

  type RawMaterialStatus = { #available; #inUse; #consumed; };

  type ProductionOrder = {
    id : Nat;
    orderNumber : Text;
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
  };

  // State
  var rawMaterialIdCounter = 0;
  var productionOrderIdCounter = 0;
  var machineIdCounter = 0;
  var batchStageIdCounter = 0;
  var qualityTestIdCounter = 0;
  var productionLogIdCounter = 0;
  var yarnInventoryIdCounter = 0;

  let rawMaterials = Map.empty<Nat, RawMaterial>();
  let productionOrders = Map.empty<Nat, ProductionOrder>();
  let machines = Map.empty<Nat, Machine>();
  let batches = Map.empty<Nat, BatchStage>();
  let qualityTests = Map.empty<Nat, QualityTest>();
  let productionLogs = Map.empty<Nat, ProductionLog>();
  let yarnInventory = Map.empty<Nat, YarnInventory>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // USER PROFILE MANAGEMENT
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

  // RAW MATERIALS
  module RawMaterial {
    public func compare(t1 : RawMaterial, t2 : RawMaterial) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

  public shared ({ caller }) func addRawMaterial(lotNumber : Text, supplier : Text, grade : Text, weightKg : Nat) : async Nat {
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
    };
    rawMaterials.add(id, rawMaterial);
    rawMaterialIdCounter += 1;
    id;
  };

  public query ({ caller }) func getRawMaterial(id : Nat) : async ?RawMaterial {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    rawMaterials.get(id);
  };

  public query ({ caller }) func getAllRawMaterials() : async [RawMaterial] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    rawMaterials.values().toArray().sort();
  };

  public shared ({ caller }) func updateRawMaterial(id : Nat, lotNumber : Text, supplier : Text, grade : Text, weightKg : Nat, status : RawMaterialStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update raw materials");
    };
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?_) {
        let updated : RawMaterial = {
          id;
          lotNumber;
          supplier;
          grade;
          weightKg;
          dateReceived = Time.now();
          status;
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

  // PRODUCTION ORDERS
  module ProductionOrder {
    public func compare(t1 : ProductionOrder, t2 : ProductionOrder) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

  public shared ({ caller }) func createProductionOrder(orderNumber : Text, productType : ProductType, yarnCountNe : Nat, twistDirection : TwistDirection, quantityKg : Nat, targetDate : Time.Time, status : OrderStatus) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create production orders");
    };
    let id = productionOrderIdCounter;
    let order : ProductionOrder = {
      id;
      orderNumber;
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production orders");
    };
    productionOrders.get(id);
  };

  public query ({ caller }) func getAllProductionOrders() : async [ProductionOrder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production orders");
    };
    productionOrders.values().toArray().sort();
  };

  public shared ({ caller }) func updateProductionOrder(id : Nat, orderNumber : Text, productType : ProductType, yarnCountNe : Nat, twistDirection : TwistDirection, quantityKg : Nat, targetDate : Time.Time, status : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update production orders");
    };
    switch (productionOrders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?_) {
        let updated : ProductionOrder = {
          id;
          orderNumber;
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

  // MACHINES
  module Machine {
    public func compare(t1 : Machine, t2 : Machine) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    machines.get(id);
  };

  public query ({ caller }) func getAllMachines() : async [Machine] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view machines");
    };
    machines.values().toArray().sort();
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

  // BATCH STAGES
  module BatchStage {
    public func compare(t1 : BatchStage, t2 : BatchStage) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view batch stages");
    };
    batches.get(id);
  };

  public query ({ caller }) func getAllBatchStages() : async [BatchStage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view batch stages");
    };
    batches.values().toArray().sort();
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

  // QUALITY TESTS
  module QualityTest {
    public func compare(t1 : QualityTest, t2 : QualityTest) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view quality tests");
    };
    qualityTests.get(id);
  };

  public query ({ caller }) func getAllQualityTests() : async [QualityTest] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view quality tests");
    };
    qualityTests.values().toArray().sort();
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

  // PRODUCTION LOGS
  module ProductionLog {
    public func compare(t1 : ProductionLog, t2 : ProductionLog) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
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
    id;
  };

  public query ({ caller }) func getProductionLog(id : Nat) : async ?ProductionLog {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production logs");
    };
    productionLogs.get(id);
  };

  public query ({ caller }) func getAllProductionLogs() : async [ProductionLog] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view production logs");
    };
    productionLogs.values().toArray().sort();
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

  // YARN INVENTORY
  module YarnInventory {
    public func compare(t1 : YarnInventory, t2 : YarnInventory) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view yarn inventory");
    };
    yarnInventory.get(id);
  };

  public query ({ caller }) func getAllYarnInventory() : async [YarnInventory] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view yarn inventory");
    };
    yarnInventory.values().toArray().sort();
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

  // DASHBOARD STATS
  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
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

    {
      totalActiveOrders;
      totalMachinesRunning;
      totalRawMaterialWeightAvailable;
      totalYarnInventoryWeight;
      recentQualityTestPassRate;
    };
  };
};
