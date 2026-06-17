import { useEffect, useState } from "react";
import { ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "../lib/utils";
import { api, type Permission, type UserListItem } from "../lib/api";
import { clearAccessibleModulesCache } from "../lib/auth";

interface QuickSetupWizardProps {
  moduleId: number;
  moduleName: string;
  moduleCode: string;
  onClose: () => void;
}

interface RouteRow {
  httpMethod: string;
  routePattern: string;
  requiredPermissionCode: string;
  description: string;
}

const METHOD_OPTIONS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800",
  POST: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800",
  PUT: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800",
  DELETE: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800",
  PATCH: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800",
};

export default function QuickSetupWizard({ moduleId, moduleName, moduleCode, onClose }: QuickSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Routes ────────────────────────────────────────────────
  const prefix = moduleCode;
  const baseRoute = `/api/${prefix.toLowerCase()}`;
  const [routes, setRoutes] = useState<RouteRow[]>([
    { httpMethod: "GET", routePattern: baseRoute, requiredPermissionCode: `${prefix}_View`, description: "" },
    { httpMethod: "POST", routePattern: baseRoute, requiredPermissionCode: `${prefix}_Create`, description: "" },
    { httpMethod: "PUT", routePattern: `${baseRoute}/{id}`, requiredPermissionCode: `${prefix}_Update`, description: "" },
    { httpMethod: "DELETE", routePattern: `${baseRoute}/{id}`, requiredPermissionCode: `${prefix}_Delete`, description: "" },
  ]);

  // ── Step 2: Role ──────────────────────────────────────────────────
  const [roleName, setRoleName] = useState(`${moduleName} Manager`);
  const [roleDescription, setRoleDescription] = useState(`Manages ${moduleName.toLowerCase()} operations`);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [permSearch, setPermSearch] = useState("");

  // ── Step 3: Users ─────────────────────────────────────────────────
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── Load permissions + users on mount ─────────────────────────────
  useEffect(() => {
    api.permissions.list()
      .then(perms => {
        setAllPermissions(perms);
        const modulePerms = perms.filter(p => p.groupName === moduleName);
        setSelectedPermIds(modulePerms.map(p => p.id));
      })
      .catch(() => {});
  }, [moduleName]);

  // ── Helpers ───────────────────────────────────────────────────────
  function getPermForMethod(method: string) {
    const map: Record<string, string> = { GET: "View", POST: "Create", PUT: "Update", DELETE: "Delete", PATCH: "Update" };
    return map[method] ? `${prefix}_${map[method]}` : "";
  }

  function updateRouteMethod(index: number, method: string) {
    setRoutes(prev => prev.map((r, i) => i === index ? { ...r, httpMethod: method, requiredPermissionCode: getPermForMethod(method) } : r));
  }

  function addRoute() {
    setRoutes(prev => [...prev, { httpMethod: "GET", routePattern: baseRoute, requiredPermissionCode: `${prefix}_View`, description: "" }]);
  }

  function removeRoute(index: number) {
    setRoutes(prev => prev.filter((_, i) => i !== index));
  }

  function togglePerm(id: number) {
    setSelectedPermIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const result = await api.users.list({ pageSize: "100" });
      setUsers(result.items);
    } catch { /* ignore */ }
    finally { setUsersLoading(false); }
  }

  function toggleUser(id: number) {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  const permIdByCode = Object.fromEntries(allPermissions.map(p => [p.code, p.id]));

  const filteredPerms = allPermissions.filter(p => {
    if (!permSearch.trim()) return true;
    const q = permSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const groupedPerms = filteredPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.groupName || "Ungrouped";
    (acc[group] ??= []).push(p);
    return acc;
  }, {});

  // ── Save ──────────────────────────────────────────────────────────
  async function completeSetup() {
    setSaving(true); setError(null);
    try {
      // 1. Register routes
      await Promise.all(routes.map(r =>
        api.modules.routes.create(moduleId, r)
      ));

      // 2. Create role
      const rolePayload = { name: roleName, description: roleDescription, permissionIds: selectedPermIds };
      const roleResult = await api.roles.create(rolePayload) as { id: number };

      // 3. Assign role to users (if any)
      if (selectedUserIds.length > 0 && roleResult?.id) {
        await Promise.all(selectedUserIds.map(userId =>
          api.users.updateRoles(userId, [roleResult.id])
        ));
      }

      clearAccessibleModulesCache();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally { setSaving(false); }
  }

  const steps = ["Routes", "Role", "Users"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border rounded-xl w-full max-w-4xl shadow-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Quick Setup: {moduleName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Register routes, create a role, and optionally assign users</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>{step > i + 1 ? "✓" : i + 1}</span>
              <span className={cn("text-xs font-medium", step === i + 1 ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 dark:text-red-400 dark:border-red-900/40 dark:bg-red-950/20">{error}</div>
        )}

        {/* Step content */}
        <div className="px-6 py-5 min-h-[350px] max-h-[50vh] overflow-y-auto">
          {/* Step 1: Routes */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Pre-filled routes based on your module code. Edit as needed.</p>
              <div className="space-y-2">
                {routes.map((route, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select value={route.httpMethod} onChange={e => updateRouteMethod(idx, e.target.value)}
                      className={cn("px-2 py-1.5 rounded border text-xs font-mono font-semibold", METHOD_COLORS[route.httpMethod] || "bg-muted")}>
                      {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input value={route.routePattern} onChange={e => setRoutes(prev => prev.map((r, i) => i === idx ? { ...r, routePattern: e.target.value } : r))}
                      placeholder="/api/..." className="flex-1 px-3 py-1.5 rounded border bg-background text-xs font-mono" />
                    <input list={`qp-codes-${idx}`} value={route.requiredPermissionCode}
                      onChange={e => setRoutes(prev => prev.map((r, i) => i === idx ? { ...r, requiredPermissionCode: e.target.value } : r))}
                      placeholder={`${prefix}_View`} className="w-44 px-3 py-1.5 rounded border bg-background text-xs font-mono" />
                    <datalist id={`qp-codes-${idx}`}>
                      {allPermissions.filter(p => p.groupName === moduleName).map(p => (
                        <option key={p.id} value={p.code}>{p.name}</option>
                      ))}
                    </datalist>
                    {routes.length > 1 && (
                      <button onClick={() => removeRoute(idx)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addRoute} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"><Plus className="w-3 h-3" /> Add Route</button>
            </div>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Role Name *</label>
                  <input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Inventory Manager"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                  <input value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Manages inventory"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Permissions ({selectedPermIds.length} selected)</label>
                <input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Search permissions..."
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2" />
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {Object.entries(groupedPerms).map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{group}</p>
                      {perms.map(p => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                          <input type="checkbox" checked={selectedPermIds.includes(p.id)} onChange={() => togglePerm(p.id)}
                            className="h-3.5 w-3.5 rounded border bg-background accent-primary" />
                          <span className="text-xs text-foreground flex-1">{p.name}</span>
                          <code className="text-xs text-muted-foreground font-mono">{p.code}</code>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Users */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Optionally assign this role to users now. You can skip this step.</p>
              <button onClick={loadUsers} disabled={usersLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
                {usersLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {users.length > 0 ? "Refresh Users" : "Load Users"}
              </button>
              {users.length > 0 && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUser(user.id)}
                        className="h-4 w-4 rounded border bg-background accent-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {user.roles.length > 0 && (
                        <span className="text-xs text-muted-foreground">{user.roles.join(", ")}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              {users.length === 0 && !usersLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">Click "Load Users" to see available users</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
            className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50">Back</button>
          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Skip</button>
                <button onClick={completeSetup} disabled={saving || !roleName.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Complete Setup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
