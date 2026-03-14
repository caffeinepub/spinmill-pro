import Map "mo:core/Map";
import Nat "mo:core/Nat";

actor {
  type SpinningUnit = { #openend; #ringSpinning; #tfo };
  type Order = { id: Nat; spinningUnit: SpinningUnit };
  let orders = Map.empty<Nat, Order>();
}
