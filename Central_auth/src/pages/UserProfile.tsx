import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, Building2, Briefcase, Calendar, Clock,
  ShieldCheck, KeyRound, Monitor, Globe, Activity, AlertTriangle,
} from "lucide-react";
import Badge from "../components/Badge";
import { api, type UserProfile } from "../lib/api";
import { cn, formatDateTime } from "../lib/utils";

const SkeletonBox = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded bg-muted animate-pulse`} />
);

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <SkeletonBox w="w-10" h="h-10" />
        <div className="space-y-2">
          <SkeletonBox w="w-48" h="h-5" />
          <SkeletonBox w="w-64" h="h-3" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-5 space-y-4">
            <SkeletonBox w="w-32" h="h-4" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <SkeletonBox w="w-20" h="h-3" />
                <SkeletonBox w="w-32" h="h-3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: typeof User }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PUT: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  PATCH: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-emerald-500/10 text-emerald-600",
  LOGOUT: "bg-slate-500/10 text-slate-600",
  CREATE: "bg-blue-500/10 text-blue-600",
  UPDATE: "bg-orange-500/10 text-orange-600",
  DELETE: "bg-red-500/10 text-red-600",
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.users.profile(Number(id))
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProfileSkeleton />;
  if (error) return (
    <div className="space-y-4">
      <button onClick={() => navigate("/user-profiles")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </button>
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {error}
      </div>
    </div>
  );
  if (!profile) return null;

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/user-profiles")}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            {profile.profilePhotoStorageKey ? (
              <img src={`/uploads/${profile.profilePhotoStorageKey}`} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile.firstName} {profile.lastName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.userName} · {profile.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {profile.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
            {profile.isLocked ? <Badge variant="danger">Locked</Badge> : <Badge variant="success">Unlocked</Badge>}
            <Badge variant={profile.twoFactorEnabled ? "success" : "outline"}>
              2FA {profile.twoFactorEnabled ? "On" : "Off"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Personal Information */}
        <div className="bg-card rounded-xl border p-5 space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </h3>
          <InfoRow label="Email" value={profile.email} icon={Mail} />
          <InfoRow label="Username" value={profile.userName} icon={User} />
          <InfoRow label="Phone" value={profile.phoneNumber} icon={Phone} />
          <InfoRow label="Employee ID" value={profile.employeeId} icon={Briefcase} />
          <InfoRow label="Tenant" value={profile.tenantName} icon={Building2} />
          <InfoRow label="Department" value={profile.departmentName} icon={Building2} />
          <InfoRow label="Designation" value={profile.designationName} icon={Briefcase} />
          <InfoRow label="Created" value={formatDateTime(profile.createdAt)} icon={Calendar} />
          <InfoRow label="Updated" value={profile.updatedAt ? formatDateTime(profile.updatedAt) : null} icon={Clock} />
          <InfoRow label="Last Login" value={profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : null} icon={Clock} />
          <InfoRow label="Failed Attempts" value={String(profile.failedLoginAttempts)} icon={AlertTriangle} />
        </div>

        {/* Roles & Permissions */}
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Roles & Permissions
          </h3>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Roles ({profile.roles.length})</p>
            <div className="flex flex-wrap gap-1">
              {profile.roles.length === 0 ? (
                <span className="text-xs text-muted-foreground">No roles assigned</span>
              ) : profile.roles.map(r => <Badge key={r.id}>{r.name}</Badge>)}
            </div>
          </div>
          <div>
            <button onClick={() => setShowPermissions(!showPermissions)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              Permissions ({profile.permissions.length}) <span className="text-[10px]">{showPermissions ? "▲" : "▼"}</span>
            </button>
            {showPermissions && (
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {profile.permissions.map(p => (
                  <Badge key={p.id} variant="outline" className="text-[10px]">
                    {p.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Direct Module Access ({profile.moduleAccesses.length})</p>
            <div className="flex flex-wrap gap-1">
              {profile.moduleAccesses.length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
              ) : profile.moduleAccesses.map(m => (
                <Badge key={m.id} variant="outline">{m.name}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Direct Route Access ({profile.routeAccesses.length})</p>
            {profile.routeAccesses.length === 0 ? (
              <span className="text-xs text-muted-foreground">None</span>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {profile.routeAccesses.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border", METHOD_COLORS[r.httpMethod] ?? "bg-muted text-muted-foreground")}>
                      {r.httpMethod}
                    </span>
                    <span className="text-muted-foreground font-mono">{r.routePattern}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" /> Active Sessions
          </h3>
          {profile.sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active sessions</p>
          ) : (
            <div className="space-y-2">
              {profile.sessions.map(s => (
                <div key={s.sessionId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.ipAddress ?? "Unknown IP"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.userAgent ?? "Unknown device"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(s.loginAtUtc)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit */}
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          {profile.recentAudit.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {profile.recentAudit.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                  <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 flex-shrink-0",
                    ACTION_COLORS[a.actionType] ?? "bg-muted text-muted-foreground")}>
                    {a.actionType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{a.entityName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">#{a.entityKey}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.ipAddress && <p className="text-[10px] text-muted-foreground">{a.ipAddress}</p>}
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
