import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldProductionOrder = {
    id : Nat;
    orderNumber : Text;
    lotNumber : Text;
    productType : {
      #carded;
      #combed;
    };
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
    productType : {
      #carded;
      #combed;
      #polyester;
      #bamboo;
      #viscose;
      #lt;
    };
    spinningUnit : {
      #openend;
      #ringSpinning;
    };
    endUse : {
      #warp;
      #weft;
      #pile;
      #ground;
      #tfo;
    };
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
      func(_, oldOrder) {
        {
          oldOrder with
          spinningUnit = #ringSpinning;
          endUse = #warp;
        };
      }
    );
    { productionOrders = newProductionOrders };
  };
};
