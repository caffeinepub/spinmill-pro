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
import { Principal } from "@dfinity/principal";
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ApprovalStatus, UserApprovalInfo } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

function truncatePrincipal(p: string): string {
  if (p.length <= 20) return p;
  return `${p.slice(0, 10)}...${p.slice(-5)}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        <CheckCircle className="w-3 h-3 mr-1" /> Approved
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
      <XCircle className="w-3 h-3 mr-1" /> Rejected
    </Badge>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin")
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium">
        Admin
      </Badge>
    );
  if (role === "user")
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium">
        User
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 font-medium">
      Guest
    </Badge>
  );
}

type ViewState =
  | "loading"
  | "not-signed-in"
  | "bootstrap-admin"
  | "request-access"
  | "pending"
  | "rejected"
  | "approved-user"
  | "admin";

export default function UserManagement() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const isLoggedIn = !!identity;

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvals, setApprovals] = useState<UserApprovalInfo[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>("guest");
  const [myApprovalStatus, setMyApprovalStatus] = useState<string | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString() ?? null;

  const loadData = useCallback(async () => {
    if (!actor || isFetching) return;
    if (!isLoggedIn) {
      setViewState("not-signed-in");
      return;
    }
    if (viewState === "admin") setIsRefreshing(true);
    else setViewState("loading");
    try {
      const a = actor as any;

      // Get role safely - backend now returns #guest for unregistered users
      let roleKey = "guest";
      let approvalKey: string | null = null;

      try {
        const roleResult = await a.getCallerUserRole();
        roleKey =
          roleResult && typeof roleResult === "object"
            ? Object.keys(roleResult as object)[0]
            : String(roleResult);
      } catch {
        roleKey = "guest";
      }

      try {
        const approvalResult = await a.getCallerApprovalStatus();
        approvalKey =
          approvalResult &&
          typeof approvalResult === "object" &&
          !Array.isArray(approvalResult)
            ? Object.keys(approvalResult as object)[0]
            : Array.isArray(approvalResult) && approvalResult.length > 0
              ? typeof approvalResult[0] === "object"
                ? Object.keys(approvalResult[0] as object)[0]
                : String(approvalResult[0])
              : null;
      } catch {
        approvalKey = null;
      }

      setMyRole(roleKey);
      setMyApprovalStatus(approvalKey);

      if (roleKey === "admin") {
        let list: UserApprovalInfo[] = [];
        try {
          list = (await a.listApprovals()) as UserApprovalInfo[];
        } catch {
          list = [];
        }
        setApprovals(list);
        setViewState("admin");
        return;
      }

      if (approvalKey === "approved") {
        setViewState("approved-user");
        return;
      }

      if (approvalKey === "pending") {
        setViewState("pending");
        return;
      }

      if (approvalKey === "rejected") {
        setViewState("rejected");
        return;
      }

      // No approval status yet -- check if any admin exists
      // We try bootstrapAdmin as a dry run -- if it returns "Admin already exists" there IS an admin
      // Otherwise we show the bootstrap button
      // We just show request-access by default, with bootstrap option visible
      setViewState("request-access");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to load user data");
      setViewState("request-access");
    } finally {
      setIsRefreshing(false);
    }
  }, [actor, isFetching, isLoggedIn, viewState]);

  useEffect(() => {
    if (!isLoggedIn) {
      setViewState("not-signed-in");
      return;
    }
    if (actor && !isFetching) {
      loadData();
    }
  }, [actor, isFetching, isLoggedIn, loadData]);

  const handleBootstrapAdmin = async () => {
    if (!actor) return;
    setActionLoading("bootstrap");
    try {
      const result = await (actor as any).bootstrapAdmin();
      if (result === "success") {
        toast.success("You are now the admin!");
        await loadData();
      } else if (result === "Admin already exists") {
        toast.info(
          "An admin already exists. Please use Request Access instead.",
        );
        setViewState("request-access");
      } else {
        toast.error(result || "Failed to become admin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to become admin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestApproval = async () => {
    if (!actor) return;
    setActionLoading("request");
    try {
      await (actor as any).requestApproval();
      setMyApprovalStatus("pending");
      setViewState("pending");
      toast.success("Access request submitted. Waiting for admin approval.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to submit access request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetApproval = async (
    principalStr: string,
    status: ApprovalStatus,
  ) => {
    if (!actor) return;
    const key = `approval-${principalStr}`;
    setActionLoading(key);
    try {
      const principal = Principal.fromText(principalStr);
      await (actor as any).setApproval(principal, { [status]: null });
      toast.success(
        status === ("approved" as string) ? "User approved" : "User rejected",
      );
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to update approval");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignRole = async (principalStr: string, role: string) => {
    if (!actor) return;
    const key = `role-${principalStr}`;
    setActionLoading(key);
    try {
      const principal = Principal.fromText(principalStr);
      await (actor as any).assignCallerUserRole(principal, { [role]: null });
      toast.success("Role updated successfully");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  // --- Not signed in ---
  if (viewState === "not-signed-in") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.error_state"
          className="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold">Sign In Required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please sign in with Internet Identity to access User Management.
          </p>
        </div>
      </div>
    );
  }

  // --- Loading ---
  if (viewState === "loading") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.loading_state"
          className="flex flex-col items-center justify-center gap-3 py-20"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  // --- Bootstrap admin (no admin exists yet) ---
  if (viewState === "bootstrap-admin") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.panel"
          className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-sm mx-auto"
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Set Up Admin</h2>
          <p className="text-sm text-muted-foreground">
            No admin has been set up yet. Click below to become the admin.
          </p>
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-left w-full">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Your Principal ID
            </p>
            <p className="text-xs font-mono text-foreground break-all">
              {callerPrincipal}
            </p>
          </div>
          <Button
            onClick={handleBootstrapAdmin}
            disabled={actionLoading === "bootstrap"}
            className="gap-2 w-full"
            data-ocid="user-mgmt.primary_button"
          >
            {actionLoading === "bootstrap" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {actionLoading === "bootstrap" ? "Setting up..." : "Become Admin"}
          </Button>
          <button
            type="button"
            onClick={() => setViewState("request-access")}
            className="text-xs text-muted-foreground underline"
          >
            An admin already exists? Request access instead.
          </button>
        </div>
      </div>
    );
  }

  // --- Request access ---
  if (viewState === "request-access") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.panel"
          className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-sm mx-auto"
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Request Access</h2>
          <p className="text-sm text-muted-foreground">
            You need admin approval to access SpinMill Pro. Submit your request
            and an admin will approve it.
          </p>
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-left w-full">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Your Principal ID
            </p>
            <p className="text-xs font-mono text-foreground break-all">
              {callerPrincipal}
            </p>
          </div>
          <Button
            onClick={handleRequestApproval}
            disabled={actionLoading === "request"}
            className="gap-2 w-full"
            data-ocid="user-mgmt.primary_button"
          >
            {actionLoading === "request" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            {actionLoading === "request" ? "Submitting..." : "Request Access"}
          </Button>
          <button
            type="button"
            onClick={() => setViewState("bootstrap-admin")}
            className="text-xs text-muted-foreground underline"
          >
            First time setup? Become admin instead.
          </button>
        </div>
      </div>
    );
  }

  // --- Pending ---
  if (viewState === "pending") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.panel"
          className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-sm mx-auto"
        >
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold">Approval Pending</h2>
          <p className="text-sm text-muted-foreground">
            Your access request has been submitted. Please wait for the admin to
            approve your access.
          </p>
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-left w-full">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Your Principal ID
            </p>
            <p className="text-xs font-mono text-foreground break-all">
              {callerPrincipal}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-2"
            data-ocid="user-mgmt.secondary_button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Status
          </Button>
        </div>
      </div>
    );
  }

  // --- Rejected ---
  if (viewState === "rejected") {
    return (
      <div className="p-6">
        <div
          data-ocid="user-mgmt.panel"
          className="flex flex-col items-center justify-center gap-4 py-20 text-center max-w-sm mx-auto"
        >
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold">Access Rejected</h2>
          <p className="text-sm text-muted-foreground">
            Your access request was rejected. Contact the admin for assistance.
          </p>
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-left w-full">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Your Principal ID
            </p>
            <p className="text-xs font-mono text-foreground break-all">
              {callerPrincipal}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Approved regular user ---
  if (viewState === "approved-user") {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          Your Account
        </h1>
        <Card data-ocid="user-mgmt.card">
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Principal ID
              </p>
              <p className="text-sm font-mono text-foreground break-all">
                {callerPrincipal}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Role
                </p>
                <RoleBadge role={myRole} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Status
                </p>
                <StatusBadge status={myApprovalStatus ?? "pending"} />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-700">
              You have access to enter and view data. Contact your admin for
              elevated permissions.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Admin view ---
  const pending = approvals.filter((a) => {
    const key =
      a.status && typeof a.status === "object"
        ? Object.keys(a.status as object)[0]
        : String(a.status);
    return key === "pending";
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve users and manage roles
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isRefreshing}
          className="gap-2"
          data-ocid="user-mgmt.secondary_button"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>{pending.length}</strong> user
            {pending.length > 1 ? "s" : ""} awaiting approval
          </p>
        </div>
      )}

      <Card data-ocid="user-mgmt.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Users ({approvals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {approvals.length === 0 ? (
            <div
              data-ocid="user-mgmt.empty_state"
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
            >
              <UserX className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No users have requested access yet.
              </p>
            </div>
          ) : (
            <Table data-ocid="user-mgmt.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Principal ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((entry, idx) => {
                  const principalStr = entry.principal.toString();
                  const statusKey =
                    entry.status && typeof entry.status === "object"
                      ? Object.keys(entry.status as object)[0]
                      : String(entry.status);
                  const isLoadingThis =
                    actionLoading === `approval-${principalStr}` ||
                    actionLoading === `role-${principalStr}`;

                  return (
                    <TableRow
                      key={principalStr}
                      data-ocid={`user-mgmt.item.${idx + 1}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {truncatePrincipal(principalStr)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={statusKey} />
                      </TableCell>
                      <TableCell>
                        {statusKey === "approved" ? (
                          <Select
                            defaultValue="user"
                            onValueChange={(v) =>
                              handleAssignRole(principalStr, v)
                            }
                            disabled={isLoadingThis}
                          >
                            <SelectTrigger
                              className="h-7 w-28 text-xs"
                              data-ocid={`user-mgmt.select.${idx + 1}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {statusKey === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() =>
                                  handleSetApproval(
                                    principalStr,
                                    "approved" as ApprovalStatus,
                                  )
                                }
                                disabled={isLoadingThis}
                                data-ocid={`user-mgmt.confirm_button.${idx + 1}`}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3 h-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() =>
                                  handleSetApproval(
                                    principalStr,
                                    "rejected" as ApprovalStatus,
                                  )
                                }
                                disabled={isLoadingThis}
                                data-ocid={`user-mgmt.delete_button.${idx + 1}`}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {statusKey === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() =>
                                handleSetApproval(
                                  principalStr,
                                  "rejected" as ApprovalStatus,
                                )
                              }
                              disabled={isLoadingThis}
                              data-ocid={`user-mgmt.delete_button.${idx + 1}`}
                            >
                              {isLoadingThis ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserX className="w-3 h-3" />
                              )}
                              Revoke
                            </Button>
                          )}
                          {statusKey === "rejected" && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              onClick={() =>
                                handleSetApproval(
                                  principalStr,
                                  "approved" as ApprovalStatus,
                                )
                              }
                              disabled={isLoadingThis}
                              data-ocid={`user-mgmt.confirm_button.${idx + 1}`}
                            >
                              Re-approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
