import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowDownToLine,
  ClipboardList,
  Factory,
  Layers,
  Package,
  Settings2,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { motion } from "motion/react";
import { useDashboardStats } from "../hooks/useQueries";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  suffix?: string;
  loading?: boolean;
  "data-ocid"?: string;
}

function KpiCard({
  title,
  value,
  icon,
  accent,
  suffix,
  loading,
  "data-ocid": ocid,
}: KpiCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        data-ocid={ocid}
        className="relative overflow-hidden border-border/60 shadow-card hover:shadow-card-hover transition-shadow duration-200"
      >
        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}
          >
            {icon}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-display tracking-tight">
                {value}
              </span>
              {suffix && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}
            </div>
          )}
        </CardContent>
        {/* accent bar */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 ${accent.replace("bg-", "bg-").replace("/15", "/60")}`}
        />
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Factory className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-display">
              Operations Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time overview of your spinning mill operations
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs status-running">
          <Activity className="w-3 h-3" />
          Live
        </Badge>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          data-ocid="dashboard.card.1"
          title="Active Orders"
          value={stats ? Number(stats.totalActiveOrders) : 0}
          icon={<ClipboardList className="w-4 h-4 text-primary" />}
          accent="bg-primary/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.2"
          title="Machines Running"
          value={stats ? Number(stats.totalMachinesRunning) : 0}
          icon={
            <Settings2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          }
          accent="bg-green-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.3"
          title="Raw Material Stock"
          value={stats ? Number(stats.totalRawMaterialWeightAvailable) : 0}
          suffix="kg"
          icon={
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          }
          accent="bg-amber-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.4"
          title="Yarn Inventory"
          value={stats ? Number(stats.totalYarnInventoryWeight) : 0}
          suffix="kg"
          icon={
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          }
          accent="bg-purple-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.5"
          title="QC Pass Rate"
          value={stats ? Number(stats.recentQualityTestPassRate) : 0}
          suffix="%"
          icon={
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          }
          accent="bg-emerald-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.6"
          title="Inward Today"
          value={stats ? Number(stats.totalInwardTodayKg) : 0}
          suffix="kg"
          icon={
            <ArrowDownToLine className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          }
          accent="bg-cyan-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.7"
          title="OE Warehouse Stock"
          value={stats ? Number(stats.oeWarehouseStockKg) : 0}
          suffix="kg"
          icon={
            <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          }
          accent="bg-blue-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.8"
          title="Ring Warehouse Stock"
          value={stats ? Number(stats.ringWarehouseStockKg) : 0}
          suffix="kg"
          icon={
            <Warehouse className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          }
          accent="bg-violet-500/15"
          loading={isLoading}
        />
        <KpiCard
          data-ocid="dashboard.card.9"
          title="Dispatched Today"
          value={stats ? Number(stats.totalDispatchedTodayKg) : 0}
          suffix="kg"
          icon={
            <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          }
          accent="bg-orange-500/15"
          loading={isLoading}
        />
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="border-border/60 shadow-card col-span-1 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Backend Connection",
                status: "Online",
                cls: "status-running",
              },
              { label: "Data Sync", status: "Active", cls: "status-running" },
              {
                label: "Production Monitoring",
                status: "Active",
                cls: "status-running",
              },
              {
                label: "Quality Alerts",
                status: "Monitoring",
                cls: "status-idle",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
              >
                <span className="text-sm text-foreground">{item.label}</span>
                <Badge
                  variant="outline"
                  className={`text-xs border ${item.cls}`}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Log Production", href: "/production-logs" },
              { label: "New Batch Stage", href: "/batch-tracking" },
              { label: "Add Quality Test", href: "/quality-control" },
              { label: "Check Inventory", href: "/yarn-inventory" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm font-medium group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                {item.label}
              </a>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
