import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ArrowUpFromLine,
  BarChart2,
  Box,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Package,
  Package2,
  PackageOpen,
  PackageSearch,
  PrinterIcon,
  Recycle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Unlock,
  X,
} from "lucide-react";
import { useState } from "react";
import { AdminPinProvider, useAdminPin } from "./hooks/AdminPinContext";
import { DropdownOptionsProvider } from "./hooks/DropdownOptionsContext";
import { UserRoleProvider } from "./hooks/UserRoleContext";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import CombinedStockReport from "./pages/CombinedStockReport";
import Dashboard from "./pages/Dashboard";
import DropdownOptionsPage from "./pages/DropdownOptions";
import InwardEntry from "./pages/InwardEntry";
import Machines from "./pages/Machines";
import MaterialIssue from "./pages/MaterialIssue";
import OutsideYarnInward from "./pages/OutsideYarnInward";
import PackingEntry from "./pages/PackingEntry";
import ProductionLogs from "./pages/ProductionLogs";
import ProductionOrders from "./pages/ProductionOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import RawMaterialOpeningStock from "./pages/RawMaterialOpeningStock";
import RawMaterials from "./pages/RawMaterials";
import Reports from "./pages/Reports";
import WarehouseTransferPage from "./pages/WarehouseTransfer";
import WasteProduction from "./pages/WasteProduction";
import YarnDispatch from "./pages/YarnDispatch";
import YarnInventory from "./pages/YarnInventory";
import YarnOpeningStock from "./pages/YarnOpeningStock";

type PageId =
  | "dashboard"
  | "raw-materials"
  | "purchase-orders"
  | "inward"
  | "outside-yarn-inward"
  | "material-issue"
  | "rm-opening-stock"
  | "yarn-opening-stock"
  | "production-orders"
  | "machines"
  | "waste-production"
  | "packing-entry"
  | "production-logs"
  | "yarn-inventory"
  | "yarn-dispatch"
  | "reports"
  | "combined-stock-report"
  | "dropdown-options"
  | "warehouse-transfer";

// Pages that require admin PIN to access
const ADMIN_REQUIRED_PAGES: PageId[] = [
  "yarn-opening-stock",
  "rm-opening-stock",
  "purchase-orders",
  "warehouse-transfer",
  "production-orders",
  "yarn-inventory",
];

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: "raw-materials",
    label: "Raw Materials",
    icon: <Package className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    icon: <ShoppingCart className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "inward",
    label: "Inward Entry",
    icon: <PackageOpen className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "outside-yarn-inward",
    label: "Outside Yarn Inward",
    icon: <Truck className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "material-issue",
    label: "Material Issue",
    icon: <ArrowUpFromLine className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "warehouse-transfer",
    label: "Warehouse Transfer",
    icon: <ArrowLeftRight className="w-4 h-4" />,
    group: "Procurement",
  },
  {
    id: "rm-opening-stock",
    label: "RM Opening Stock",
    icon: <PackageSearch className="w-4 h-4" />,
    group: "Opening Stock",
  },
  {
    id: "yarn-opening-stock",
    label: "Yarn Opening Stock",
    icon: <Package2 className="w-4 h-4" />,
    group: "Opening Stock",
  },
  {
    id: "production-orders",
    label: "Production Orders",
    icon: <ClipboardList className="w-4 h-4" />,
    group: "Production",
  },
  {
    id: "machines",
    label: "Machines",
    icon: <Settings2 className="w-4 h-4" />,
    group: "Production",
  },
  {
    id: "waste-production",
    label: "Waste Production",
    icon: <Recycle className="w-4 h-4" />,
    group: "Waste",
  },
  {
    id: "packing-entry",
    label: "Packing Entry",
    icon: <Box className="w-4 h-4" />,
    group: "Packing",
  },
  {
    id: "reports",
    label: "Reports",
    icon: <BarChart2 className="w-4 h-4" />,
    group: "Reports",
  },
  {
    id: "production-logs",
    label: "Production Logs",
    icon: <FileText className="w-4 h-4" />,
    group: "Reports",
  },
  {
    id: "combined-stock-report",
    label: "Combined Stock Report",
    icon: <PrinterIcon className="w-4 h-4" />,
    group: "Reports",
  },
  {
    id: "yarn-inventory",
    label: "Yarn Inventory",
    icon: <Package2 className="w-4 h-4" />,
    group: "Packing",
  },
  {
    id: "yarn-dispatch",
    label: "Yarn Dispatch",
    icon: <Truck className="w-4 h-4" />,
    group: "Packing",
  },
  {
    id: "dropdown-options",
    label: "Dropdown Options",
    icon: <ListChecks className="w-4 h-4" />,
    group: "Admin",
  },
];

const pageComponents: Record<PageId, React.ReactNode> = {
  dashboard: <Dashboard />,
  "raw-materials": <RawMaterials />,
  "purchase-orders": <PurchaseOrders />,
  inward: <InwardEntry />,
  "outside-yarn-inward": <OutsideYarnInward />,
  "material-issue": <MaterialIssue />,
  "rm-opening-stock": <RawMaterialOpeningStock />,
  "yarn-opening-stock": <YarnOpeningStock />,
  "production-orders": <ProductionOrders />,
  machines: <Machines />,
  "waste-production": <WasteProduction />,
  "packing-entry": <PackingEntry />,
  "production-logs": <ProductionLogs />,
  "yarn-inventory": <YarnInventory />,
  "yarn-dispatch": <YarnDispatch />,
  reports: <Reports />,
  "combined-stock-report": <CombinedStockReport />,
  "dropdown-options": <DropdownOptionsPage />,
  "warehouse-transfer": <WarehouseTransferPage />,
};

const groups = [
  "Procurement",
  "Opening Stock",
  "Production",
  "Waste",
  "Packing",
  "Reports",
  "Admin",
];

export default function App() {
  return (
    <AdminPinProvider>
      <DropdownOptionsProvider>
        <UserRoleProvider>
          <AppContent />
        </UserRoleProvider>
      </DropdownOptionsProvider>
    </AdminPinProvider>
  );
}

function AppContent() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingPage, setPendingPage] = useState<PageId | null>(null);
  const [showPinForNav, setShowPinForNav] = useState(false);

  const { isAdminUnlocked } = useAdminPin();
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isLoggedIn = !!identity;

  function handleRefresh() {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  }

  const ungrouped = navItems.filter((i) => !i.group);
  const activeLabel =
    navItems.find((n) => n.id === activePage)?.label ?? "Dashboard";

  function navigate(id: PageId) {
    if (ADMIN_REQUIRED_PAGES.includes(id) && !isAdminUnlocked) {
      setPendingPage(id);
      setShowPinForNav(true);
      return;
    }
    setActivePage(id);
    setSidebarOpen(false);
  }

  function handleNavPinSuccess() {
    if (pendingPage) {
      setActivePage(pendingPage);
      setSidebarOpen(false);
    }
    setPendingPage(null);
    setShowPinForNav(false);
  }

  function handleNavPinCancel() {
    setPendingPage(null);
    setShowPinForNav(false);
  }

  const sidebarContent = (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-sidebar-border/60">
        <div className="flex items-center justify-center overflow-hidden">
          <img
            src="/assets/uploads/photo_2022-07-19-14.09.01-1.jpeg"
            alt="SpinMill Pro"
            className="h-16 w-full object-contain max-w-full"
            style={{ maxHeight: "64px" }}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <div
            style={{ display: "none" }}
            className="flex-col items-center justify-center w-full"
          >
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              SpinMill Pro
            </span>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Ungrouped */}
        <div className="space-y-0.5">
          {ungrouped.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activePage === item.id}
              requiresAdmin={ADMIN_REQUIRED_PAGES.includes(item.id)}
              isAdminUnlocked={isAdminUnlocked}
              onClick={() => navigate(item.id)}
            />
          ))}
        </div>

        {/* Grouped */}
        {groups.map((group) => {
          const items = navItems.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-1">
                {group}
              </p>
              {items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activePage === item.id}
                  requiresAdmin={ADMIN_REQUIRED_PAGES.includes(item.id)}
                  isAdminUnlocked={isAdminUnlocked}
                  onClick={() => navigate(item.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border/60 space-y-3">
        {/* Login / Logout */}
        {isLoggedIn ? (
          <Button
            variant="outline"
            size="sm"
            data-ocid="nav.logout_button"
            className="w-full gap-2 text-xs border-sidebar-border/60 text-sidebar-foreground/70 hover:text-sidebar-foreground bg-transparent hover:bg-sidebar-accent/60"
            onClick={clear}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        ) : (
          <Button
            size="sm"
            data-ocid="nav.login_button"
            className="w-full gap-2 text-xs"
            onClick={login}
            disabled={isLoggingIn || isInitializing}
          >
            <LogIn className="w-3.5 h-3.5" />
            {isLoggingIn ? "Signing in..." : "Sign In to Save"}
          </Button>
        )}

        {/* Admin PIN section */}
        <AdminAccessButton />

        <p className="text-[10px] text-sidebar-foreground/30 text-center">
          © {new Date().getFullYear()}. Built with{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-sidebar-foreground/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background font-body">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar flex-shrink-0 border-r border-sidebar-border">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar overlay"
          />
          <aside className="relative w-64 bg-sidebar flex flex-col shadow-xl">
            <button
              type="button"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar (mobile + breadcrumb) */}
        <header className="flex items-center h-12 px-4 border-b border-border/60 bg-card/50 backdrop-blur-sm flex-shrink-0 gap-2">
          <button
            type="button"
            className="md:hidden mr-1 w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            data-ocid="nav.toggle"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1">
            <span>SpinMill Pro</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{activeLabel}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-ocid="nav.refresh_button"
            className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </header>

        {/* Login Banner */}
        {!isLoggedIn && !isInitializing && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              You are not signed in. Sign in to save, edit, or delete data.
            </p>
            <Button
              size="sm"
              variant="outline"
              data-ocid="nav.banner_login_button"
              className="h-7 text-xs gap-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 bg-transparent"
              onClick={login}
              disabled={isLoggingIn}
            >
              <LogIn className="w-3 h-3" />
              Sign In
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" key={refreshKey}>
          {pageComponents[activePage]}
        </main>
      </div>

      {/* Admin PIN dialog for navigation gating */}
      <AdminPinNavDialog
        open={showPinForNav}
        onSuccess={handleNavPinSuccess}
        onCancel={handleNavPinCancel}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

// PIN dialog shown when navigating to an admin-gated page
function AdminPinNavDialog({
  open,
  onSuccess,
  onCancel,
}: {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { unlockAdmin } = useAdminPin();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = unlockAdmin(pin);
    if (success) {
      setPin("");
      setError("");
      onSuccess();
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
  }

  function handleCancel() {
    setPin("");
    setError("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-w-sm" data-ocid="admin.nav_dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Admin Access Required
          </DialogTitle>
          <DialogDescription>
            This section requires admin access. Enter your PIN to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nav-admin-pin">PIN</Label>
            <Input
              id="nav-admin-pin"
              type="password"
              placeholder="Enter admin PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              autoFocus
              maxLength={20}
              data-ocid="admin.nav_input"
            />
            {error && (
              <p
                className="text-xs text-red-500"
                data-ocid="admin.nav_error_state"
              >
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              data-ocid="admin.nav_cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!pin}
              data-ocid="admin.nav_submit_button"
            >
              Unlock &amp; Open
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminPinDialog({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const { unlockAdmin } = useAdminPin();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const success = unlockAdmin(pin);
    if (success) {
      setPin("");
      setError("");
      onClose();
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
  }

  function handleClose() {
    setPin("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm" data-ocid="admin.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Admin Access
          </DialogTitle>
          <DialogDescription>
            Enter the admin PIN to unlock edit and delete functions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="admin-pin">PIN</Label>
            <Input
              id="admin-pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              autoFocus
              maxLength={20}
              data-ocid="admin.input"
            />
            {error && (
              <p className="text-xs text-red-500" data-ocid="admin.error_state">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              data-ocid="admin.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!pin}
              data-ocid="admin.submit_button"
            >
              Unlock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminAccessButton() {
  const { isAdminUnlocked, lockAdmin } = useAdminPin();
  const [showDialog, setShowDialog] = useState(false);

  if (isAdminUnlocked) {
    return (
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Active
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={lockAdmin}
          title="Lock admin access"
          data-ocid="admin.toggle"
        >
          <Lock className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
        onClick={() => setShowDialog(true)}
        data-ocid="admin.open_modal_button"
      >
        <Unlock className="w-3.5 h-3.5" />
        Admin Access
      </Button>
      <AdminPinDialog open={showDialog} onClose={() => setShowDialog(false)} />
    </>
  );
}

function NavButton({
  item,
  active,
  requiresAdmin,
  isAdminUnlocked,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  requiresAdmin: boolean;
  isAdminUnlocked: boolean;
  onClick: () => void;
}) {
  const showLock = requiresAdmin && !isAdminUnlocked && !active;

  return (
    <button
      type="button"
      data-ocid={`nav.${item.id}.link`}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 text-left",
        active
          ? "bg-sidebar-primary/20 text-sidebar-primary font-medium shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 transition-colors",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/50",
        )}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
      {active && (
        <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary/60 flex-shrink-0" />
      )}
      {showLock && (
        <Lock className="w-3 h-3 ml-auto opacity-40 flex-shrink-0" />
      )}
    </button>
  );
}
