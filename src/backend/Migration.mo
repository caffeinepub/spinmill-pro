import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module Migration {

  // Old types -- must match what is actually stored in stable memory.
  // ProductionOrderV0 includes singleYarnLotNumber because a previous migration
  // already wrote this field; if we omit it the deserialiser will reject it.

  type SpinningUnitV0 = { #openend; #ringSpinning; #tfo; #outsideYarn };
  type ProductType = { #carded; #combed; #polyester; #bamboo; #viscose; #lt };
  type EndUse = { #warp; #weft; #pile; #ground; #tfo };
  type TwistDirection = { #s; #z };
  type OrderStatus = { #pending; #inProgress; #completed; #cancelled };
  type DispatchDestination = { #weaving; #kolhapur; #ambala; #outside; #amravati; #softWinding; #tfo };

  type ProductionOrderV0 = {
    id : Nat;
    orderNumber : Text;
    lotNumber : Text;
    productType : ProductType;
    spinningUnit : SpinningUnitV0;
    endUse : EndUse;
    yarnCountNe : Nat;
    twistDirection : TwistDirection;
    quantityKg : Nat;
    targetDate : Time.Time;
    status : OrderStatus;
    singleYarnLotNumber : ?Text;
  };

  type PackingEntryV0 = {
    id : Nat;
    packingNumber : Text;
    packingDate : Time.Time;
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnitV0;
    productType : ProductType;
    endUse : EndUse;
    quantityKg : Nat;
    remarks : Text;
  };

  type DispatchEntryV0 = {
    id : Nat;
    dispatchNumber : Text;
    dispatchDate : Time.Time;
    lotNumber : Text;
    destination : DispatchDestination;
    quantityKg : Nat;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnitV0;
    productType : ProductType;
    endUse : EndUse;
    remarks : Text;
  };

  type YarnOpeningStockRecordV0 = {
    id : Nat;
    lotNumber : Text;
    yarnCountNe : Nat;
    spinningUnit : SpinningUnitV0;
    productType : ProductType;
    endUse : EndUse;
    weightKg : Nat;
    createdAt : Time.Time;
  };

  // New types

  type SpinningUnit = { #openend; #ringSpinning; #tfo; #outsideYarn };

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
    singleYarnLotNumber : ?Text;
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

  func migrateSpinningUnit(old : SpinningUnitV0) : SpinningUnit {
    switch old {
      case (#openend) #openend;
      case (#ringSpinning) #ringSpinning;
      case (#tfo) #tfo;
      case (#outsideYarn) #outsideYarn;
    };
  };

  public func migration(
    old : {
      productionOrders : Map.Map<Nat, ProductionOrderV0>;
      packingEntries : Map.Map<Nat, PackingEntryV0>;
      dispatchEntries : Map.Map<Nat, DispatchEntryV0>;
      yarnOpeningStock : Map.Map<Nat, YarnOpeningStockRecordV0>;
    }
  ) : {
    productionOrders : Map.Map<Nat, ProductionOrder>;
    packingEntries : Map.Map<Nat, PackingEntry>;
    dispatchEntries : Map.Map<Nat, DispatchEntry>;
    yarnOpeningStock : Map.Map<Nat, YarnOpeningStockRecord>;
  } {
    let newProductionOrders = Map.empty<Nat, ProductionOrder>();
    for ((k, v) in old.productionOrders.entries()) {
      newProductionOrders.add(k, {
        id = v.id;
        orderNumber = v.orderNumber;
        lotNumber = v.lotNumber;
        productType = v.productType;
        spinningUnit = migrateSpinningUnit(v.spinningUnit);
        endUse = v.endUse;
        yarnCountNe = v.yarnCountNe;
        twistDirection = v.twistDirection;
        quantityKg = v.quantityKg;
        targetDate = v.targetDate;
        status = v.status;
        singleYarnLotNumber = v.singleYarnLotNumber;
      });
    };

    let newPackingEntries = Map.empty<Nat, PackingEntry>();
    for ((k, v) in old.packingEntries.entries()) {
      newPackingEntries.add(k, {
        id = v.id;
        packingNumber = v.packingNumber;
        packingDate = v.packingDate;
        lotNumber = v.lotNumber;
        yarnCountNe = v.yarnCountNe;
        spinningUnit = migrateSpinningUnit(v.spinningUnit);
        productType = v.productType;
        endUse = v.endUse;
        quantityKg = v.quantityKg;
        remarks = v.remarks;
      });
    };

    let newDispatchEntries = Map.empty<Nat, DispatchEntry>();
    for ((k, v) in old.dispatchEntries.entries()) {
      newDispatchEntries.add(k, {
        id = v.id;
        dispatchNumber = v.dispatchNumber;
        dispatchDate = v.dispatchDate;
        lotNumber = v.lotNumber;
        destination = v.destination;
        quantityKg = v.quantityKg;
        yarnCountNe = v.yarnCountNe;
        spinningUnit = migrateSpinningUnit(v.spinningUnit);
        productType = v.productType;
        endUse = v.endUse;
        remarks = v.remarks;
      });
    };

    let newYarnOpeningStock = Map.empty<Nat, YarnOpeningStockRecord>();
    for ((k, v) in old.yarnOpeningStock.entries()) {
      newYarnOpeningStock.add(k, {
        id = v.id;
        lotNumber = v.lotNumber;
        yarnCountNe = v.yarnCountNe;
        spinningUnit = migrateSpinningUnit(v.spinningUnit);
        productType = v.productType;
        endUse = v.endUse;
        weightKg = v.weightKg;
        createdAt = v.createdAt;
      });
    };

    {
      productionOrders = newProductionOrders;
      packingEntries = newPackingEntries;
      dispatchEntries = newDispatchEntries;
      yarnOpeningStock = newYarnOpeningStock;
    };
  };

}
