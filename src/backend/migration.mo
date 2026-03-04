import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldProductionOrder = {
    id : Nat;
    orderNumber : Text;
    productType : { #carded; #combed };
    yarnCountNe : Nat;
    twistDirection : { #s; #z };
    quantityKg : Nat;
    targetDate : Int;
    status : { #pending; #inProgress; #completed; #cancelled };
  };

  type OldActor = {
    productionOrders : Map.Map<Nat, OldProductionOrder>;
  };

  type NewProductionOrder = {
    id : Nat;
    orderNumber : Text;
    lotNumber : Text;
    productType : { #carded; #combed };
    yarnCountNe : Nat;
    twistDirection : { #s; #z };
    quantityKg : Nat;
    targetDate : Int;
    status : { #pending; #inProgress; #completed; #cancelled };
  };

  type NewActor = {
    productionOrders : Map.Map<Nat, NewProductionOrder>;
  };

  public func run(old : OldActor) : NewActor {
    let newProductionOrders = old.productionOrders.map<Nat, OldProductionOrder, NewProductionOrder>(
      func(_id, oldOrder) {
        { oldOrder with lotNumber = "UNKNOWN" };
      }
    );
    { productionOrders = newProductionOrders };
  };
};
