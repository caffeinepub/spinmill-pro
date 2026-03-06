import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  backendInterface as FullBackendInterface,
  UserEntry,
} from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function fullActor(actor: unknown): FullBackendInterface {
  return actor as FullBackendInterface;
}

function truncatePrincipal(p: string): string {
  if (p.length <= 20) return p;
  return `${p.slice(0, 10)}...${p.slice(-5)}`;
}

function normalizeRole(role: unknown): string {
  if (typeof role === "string") return role;
  if (role && typeof role === "object") {
    const keys = Object.keys(role as object);
    if (keys.length > 0) return keys[0];
  }
  return "guest";
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium">
        Admin
      </Badge>
    );
  }
  if (role === "user") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-medium">
        User
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 font-medium">
      Guest
    </Badge>
  );
}

export default function UserManagement() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const isLoggedIn = !!identity;

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString() ?? null;

  const checkAdminAndLoad = useCallback(async () => {
    if (!isLoggedIn || !actor || isFetching) return;
    setLoading(true);
    try {
      const adminStatus = await fullActor(actor).isCallerAdmin();
      setIsAdmin(adminStatus);
      if (adminStatus) {
        const allUsers = await fullActor(actor).getAllUsers();
        setUsers(allUsers);
      }
    } catch (err) {
      console.error(err);
      setIsAdmin(false);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [actor, isFetching, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      setIsAdmin(null);
      setUsers([]);
      return;
    }
    if (actor && !isFetching) {
      checkAdminAndLoad();
    }
  }, [actor, isFetching, isLoggedIn, checkAdminAndLoad]);

  const handleRoleChange = async (user: UserEntry, newRole: string) => {
    if (!actor) return;
    const principalStr = user.principal.toString();
    setActionLoading(`role-${principalStr}`);
    try {
      await fullActor(actor).updateUserRole(
        user.principal,
        newRole as UserEntry["role"],
      );
      toast.success("User role updated successfully");
      await checkAdminAndLoad();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveUser = async (user: UserEntry) => {
    if (!actor) return;
    const principalStr = user.principal.toString();
    setActionLoading(`remove-${principalStr}`);
    try {
      await fullActor(actor).removeUser(user.principal);
      toast.success("User removed successfully");
      await checkAdminAndLoad();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove user");
    } finally {
      setActionLoading(null);
    }
  };

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.error_state"
          className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sign In Required
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please sign in with Internet Identity to access User Management.
          </p>
        </div>
      </div>
    );
  }

  // Loading (actor initializing or data fetching)
  if (isFetching || loading) {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.loading_state"
          className="flex flex-col items-center justify-center gap-3 py-20"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (isAdmin === false) {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.error_state"
          className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Admin Access Required
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You do not have permission to view this page. Contact an
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage registered users and their roles
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-ocid="user-mgmt.secondary_button"
          onClick={checkAdminAndLoad}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-ocid="user-mgmt.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-foreground">
                {users.length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card data-ocid="user-mgmt.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-foreground">
                {users.filter((u) => normalizeRole(u.role) === "admin").length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card data-ocid="user-mgmt.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regular Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold text-foreground">
                {users.filter((u) => normalizeRole(u.role) === "user").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Registered Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div
              data-ocid="user-mgmt.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center gap-2"
            >
              <UserX className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No users registered yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="user-mgmt.table">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12 text-xs font-semibold">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Principal
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Role
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right pr-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => {
                    const principalStr = user.principal.toString();
                    const isSelf = callerPrincipal === principalStr;
                    const role = normalizeRole(user.role);
                    const isRoleLoading =
                      actionLoading === `role-${principalStr}`;
                    const isRemoveLoading =
                      actionLoading === `remove-${principalStr}`;

                    return (
                      <TableRow
                        key={principalStr}
                        data-ocid={`user-mgmt.item.${idx + 1}`}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="text-sm text-muted-foreground font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                              {truncatePrincipal(principalStr)}
                            </code>
                            {isSelf && (
                              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] hover:bg-indigo-100">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={role} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Change Role Dropdown */}
                            <Select
                              defaultValue={role}
                              disabled={
                                isSelf || isRoleLoading || isRemoveLoading
                              }
                              onValueChange={(val) =>
                                handleRoleChange(user, val)
                              }
                            >
                              <SelectTrigger
                                className="h-8 w-28 text-xs"
                                data-ocid={`user-mgmt.select.${idx + 1}`}
                              >
                                {isRoleLoading ? (
                                  <span className="flex items-center gap-1.5">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving…
                                  </span>
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin" className="text-xs">
                                  Admin
                                </SelectItem>
                                <SelectItem value="user" className="text-xs">
                                  User
                                </SelectItem>
                                <SelectItem value="guest" className="text-xs">
                                  Guest
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Remove Button with Confirm Dialog */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  data-ocid={`user-mgmt.delete_button.${idx + 1}`}
                                  disabled={
                                    isSelf || isRemoveLoading || isRoleLoading
                                  }
                                  className="h-8 px-2.5 text-xs gap-1.5"
                                >
                                  {isRemoveLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserX className="w-3 h-3" />
                                  )}
                                  {isRemoveLoading ? "Removing…" : "Remove"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent data-ocid="user-mgmt.dialog">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove User
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove this user?
                                    They will lose all access to SpinMill Pro.
                                    This action cannot be undone.
                                    <br />
                                    <code className="text-xs font-mono mt-1 block text-foreground">
                                      {truncatePrincipal(principalStr)}
                                    </code>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-ocid="user-mgmt.cancel_button">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    data-ocid="user-mgmt.confirm_button"
                                    onClick={() => handleRemoveUser(user)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
