import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // First non-anonymous user to sign in always becomes admin. No token required.
  public func initialize(state : AccessControlState, caller : Principal, adminToken : Text, userProvidedToken : Text) {
    if (caller.isAnonymous()) { return };
    switch (state.userRoles.get(caller)) {
      case (?_) {}; // already registered, skip
      case (null) {
        if (not state.adminAssigned) {
          state.userRoles.add(caller, #admin);
          state.adminAssigned := true;
        } else {
          state.userRoles.add(caller, #user);
        };
      };
    };
  };

  // Returns #guest for unregistered users instead of trapping.
  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) { #guest };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      return; // silently ignore unauthorized attempts
    };
    state.userRoles.add(user, role);
  };

  // Allows any authenticated user to claim admin IF no admin currently exists.
  // This is the recovery path when someone was registered as 'user' before an admin existed.
  public func claimAdminIfNoAdminExists(state : AccessControlState, caller : Principal) : Bool {
    if (caller.isAnonymous()) { return false };
    // Check if any admin currently exists in the map
    var hasAdmin = false;
    for ((_, role) in state.userRoles.entries()) {
      if (role == #admin) { hasAdmin := true };
    };
    if (not hasAdmin) {
      state.userRoles.add(caller, #admin);
      state.adminAssigned := true;
      true;
    } else {
      false;
    };
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin or requiredRole == #guest) { true } else {
      userRole == requiredRole;
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
