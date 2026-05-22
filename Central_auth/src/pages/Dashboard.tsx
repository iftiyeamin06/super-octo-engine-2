import { useEffect, useState } from "react";
import { Users, ShieldCheck, Building2, Activity, Key, AlertTriangle, Clock, Globe } from "lucide-react";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import { api, type DashboardStats, type RecentUser, type AuditActivity } from "../lib/api";

// ── Skeleton helpers ───────────────────────────────────────────
const SkeletonBox = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded bg-muted animate-pulse`} />
);

function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox w="w-24" h="h-3" />
        <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
      </div>
      <SkeletonBox w="w-16" h="h-7" />
      <SkeletonBox w="w-20" h="h-3" />
    </div>
  );
}

function RecentUsersSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <SkeletonBox w="w-28" h="h-4" />
        <SkeletonBox w="w-12" h="h-3" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBox w="w-36" h="h-3" />
              <SkeletonBox w="w-48" h="h-3" />
            </div>
            <SkeletonBox w="w-16" h="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <SkeletonBox w="w-28" h="h-4" />
        <SkeletonBox w="w-8" h="h-3" />
      </div>
      <div className="px-5 py-3 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-muted animate-pulse mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBox w="w-24" h="h-3" />
              <SkeletonBox w="w-32" h="h-3" />
              <SkeletonBox w="w-40" h="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Color dot for audit feed ───────────────────────────────────
const activityDot = (type: string) => {
  const colors: Record<string, string> = {
    Login: "bg-emerald-500",
    "Role Assigned": "bg-blue-500",
    Failed: "bg-red-500",
    Reset: "bg-orange-500",
  };
  const color = Object.entries(colors).find(([k]) => type.includes(k))?.[1] ?? "bg-slate-400";
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
};

// ── Main component ─────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [audit, setAudit] = useState<AuditActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard.stats(), api.dashboard.recentUsers(), api.dashboard.recentAudit()])
      .then(([s, u, a]) => { setStats(s); setUsers(u); setAudit(a); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Skeleton state ───────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><RecentUsersSkeleton /></div>
        <AuditSkeleton />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            <SkeletonBox w="w-24" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Error state ──────────────────────────────────────────────
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-500 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary hover:underline">
          Retry
        </button>
      </div>
    </div>
  );

  // ── Loaded state ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"     value={stats?.totalUsers ?? 0}     icon={Users}        color="purple" trend={{ value: `${stats?.activeUsers ?? 0} active`, positive: true }} />
        <StatCard label="Active Sessions" value={stats?.activeSessions ?? 0} icon={Activity}     color="blue" />
        <StatCard label="Roles Defined"   value={stats?.totalRoles ?? 0}     icon={ShieldCheck}  color="green" />
        <StatCard label="Tenants"         value={stats?.totalTenants ?? 0}   icon={Building2}    color="orange" />
        <StatCard label="Active Services" value={stats?.totalServices ?? 0}  icon={Globe}        color="blue" />
        <StatCard label="API Keys"        value={stats?.totalApiKeys ?? 0}   icon={Key}          color="purple" />
        <StatCard label="Locked Accounts" value={stats?.lockedUsers ?? 0}    icon={AlertTriangle} color="red" trend={{ value: "accounts locked", positive: false }} />
        <StatCard label="Pending OTPs"    value={stats?.pendingOtps ?? 0}    icon={Clock}        color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="lg:col-span-2 bg-card rounded-xl border">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-foreground">Recent Users</h2>
            <a href="/users" className="text-xs text-primary hover:underline">View all</a>
          </div>
          <div className="divide-y">
            {users.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No users found</p>
            ) : users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {u.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {u.tenant && <Badge variant="outline">{u.tenant}</Badge>}
                  {u.role   && <Badge>{u.role}</Badge>}
                </div>
                {u.isLocked
                  ? <Badge variant="danger">Locked</Badge>
                  : u.isActive
                    ? <Badge variant="success">Active</Badge>
                    : <Badge variant="outline">Inactive</Badge>}
                <p className="text-xs text-muted-foreground w-24 text-right hidden md:block">
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Feed */}
        <div className="bg-card rounded-xl border">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-foreground">Audit Activity</h2>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="px-5 py-3 space-y-4">
            {audit.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No audit records</p>
            ) : audit.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="mt-1.5">{activityDot(a.actionType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.actionType}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.entityName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.userEmail ?? "System"} · {new Date(a.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Modules",     value: stats?.totalModules ?? 0,     color: "bg-blue-500/10 text-blue-600" },
          { label: "Total Permissions", value: stats?.totalPermissions ?? 0, color: "bg-purple-500/10 text-purple-600" },
          { label: "Active Users",      value: stats?.activeUsers ?? 0,      color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Locked Accounts",   value: stats?.lockedUsers ?? 0,      color: "bg-red-500/10 text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${s.color}`}>
              {s.value}
            </div>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
