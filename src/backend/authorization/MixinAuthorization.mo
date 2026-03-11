import AccessControl "./access-control";
import Prim "mo:prim";

mixin (accessControlState : AccessControl.AccessControlState) {
  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func _initializeAccessControlWithSecret(userSecret : Text) : async () {
    switch (Prim.envVar<system>("CAFFEINE_ADMIN_TOKEN")) {
      case (null) {
        // No token available — first user becomes admin automatically
        AccessControl.initialize(accessControlState, caller, "", "");
      };
      case (?adminToken) {
        AccessControl.initialize(accessControlState, caller, adminToken, userSecret);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Recovery function: grants admin to the caller if NO admin currently exists.
  // Works even if the user was previously registered as 'user' role.
  public shared ({ caller }) func claimAdminIfNoAdminExists() : async Bool {
    AccessControl.claimAdminIfNoAdminExists(accessControlState, caller);
  };
};
