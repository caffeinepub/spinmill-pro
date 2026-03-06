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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  KeyRound,
  Loader2,
  LogOut,
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

const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;
const LOAD_TIMEOUT_MS = 10000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function UserManagement() {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const isLoggedIn = !!identity;

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Claim admin dialog state
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);

  const callerPrincipal = identity?.getPrincipal().toString() ?? null;

  const checkAdminAndLoad = useCallback(async () => {
    if (!isLoggedIn || !actor || isFetching) return;
    setLoading(true);
    setLoadTimedOut(false);

    // Set a timeout guard — if loading takes too long, surface an error
    const timeoutId = setTimeout(() => {
      setLoadTimedOut(true);
      setLoading(false);
    }, LOAD_TIMEOUT_MS);

    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const adminStatus = await fullActor(actor).isCallerAdmin();
        clearTimeout(timeoutId);
        setIsAdmin(adminStatus);
        if (adminStatus) {
          const allUsers = await fullActor(actor).getAllUsers();
          setUsers(allUsers);
        }
        setLoading(false);
        setRetryCount(attempt);
        return;
      } catch (err) {
        lastErr = err;
        console.error(`isCallerAdmin attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    // All retries exhausted
    clearTimeout(timeoutId);
    console.error("All retries failed:", lastErr);
    setIsAdmin(false);
    setLoading(false);
    toast.error("Failed to load user data. Please try again.");
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

  const handleClaimAdmin = async () => {
    if (!actor || !adminTokenInput.trim()) return;
    setClaimLoading(true);
    try {
      // Cast to any because _initializeAccessControlWithSecret is a platform
      // method not reflected in the generated type definitions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any)._initializeAccessControlWithSecret(
        adminTokenInput.trim(),
      );
      const adminStatus = await fullActor(actor).isCallerAdmin();
      if (adminStatus) {
        toast.success("Admin access granted!");
        setClaimDialogOpen(false);
        setAdminTokenInput("");
        // Reload the page to re-initialize the actor with proper admin context
        window.location.reload();
      } else {
        toast.error("Invalid admin token");
      }
    } catch (err) {
      console.error("Claim admin failed:", err);
      toast.error("Invalid admin token");
    } finally {
      setClaimLoading(false);
    }
  };

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
          <p className="text-sm text-muted-foreground">
            Checking your access
            {retryCount > 0 ? ` (retry ${retryCount}/${MAX_RETRIES})` : "..."}
          </p>
        </div>
      </div>
    );
  }

  // Timed out
  if (loadTimedOut) {
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
            Taking too long
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            User Management is taking longer than expected to load. Please try
            again.
          </p>
          <Button
            variant="outline"
            size="sm"
            data-ocid="user-mgmt.retry_button"
            onClick={checkAdminAndLoad}
            className="gap-2 mt-1"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
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
          className="flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-red-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Admin Access Required
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your account does not have admin access.
            </p>
          </div>
          <div className="max-w-sm w-full space-y-2 text-left">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                How to get access
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-primary mt-0.5 shrink-0">
                    1.
                  </span>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      App owner?
                    </span>{" "}
                    Use the admin token from your Caffeine dashboard to claim
                    admin access below.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-primary mt-0.5 shrink-0">
                    2.
                  </span>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Another user signed in first?
                    </span>{" "}
                    Ask them to go to User Management and change your role to
                    Admin.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button
              size="sm"
              data-ocid="user-mgmt.open_modal_button"
              onClick={() => setClaimDialogOpen(true)}
              className="gap-2 w-full"
            >
              <KeyRound className="w-4 h-4" />
              Claim Admin Access
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-ocid="user-mgmt.retry_button"
              onClick={checkAdminAndLoad}
              className="gap-2 w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-ocid="user-mgmt.secondary_button"
              onClick={clear}
              className="gap-2 w-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Claim Admin Dialog */}
        <Dialog
          open={claimDialogOpen}
          onOpenChange={(open) => {
            setClaimDialogOpen(open);
            if (!open) setAdminTokenInput("");
          }}
        >
          <DialogContent data-ocid="user-mgmt.dialog" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Claim Admin Access
              </DialogTitle>
              <DialogDescription>
                Enter the admin token from your Caffeine dashboard to claim
                admin access for this app.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-token" className="text-sm font-medium">
                  Admin Token
                </Label>
                <Input
                  id="admin-token"
                  type="password"
                  placeholder="Paste your admin token here"
                  data-ocid="user-mgmt.input"
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !claimLoading &&
                      adminTokenInput.trim()
                    ) {
                      handleClaimAdmin();
                    }
                  }}
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                data-ocid="user-mgmt.cancel_button"
                onClick={() => {
                  setClaimDialogOpen(false);
                  setAdminTokenInput("");
                }}
                disabled={claimLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-ocid="user-mgmt.confirm_button"
                onClick={handleClaimAdmin}
                disabled={claimLoading || !adminTokenInput.trim()}
                className="gap-2"
              >
                {claimLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {claimLoading ? "Verifying..." : "Claim Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
