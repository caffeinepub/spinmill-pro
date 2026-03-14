import Map "mo:core/Map";
import Nat "mo:core/Nat";

actor {
  type SpinningUnitV0 = { #openend; #ringSpinning; #tfo };
  type SpinningUnit = { #openend; #ringSpinning; #tfo; #outsideYarn };
  type OrderV0 = { id: Nat; spinningUnit: SpinningUnitV0 };
  type Order = { id: Nat; spinningUnit: SpinningUnit };

  // Old name: will receive old `orders` data? Or not?
  let orders_v0 = Map.empty<Nat, OrderV0>();
  // New name with new type
  let orders = Map.empty<Nat, Order>();
}
