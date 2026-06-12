import { useEffect, useRef, useState } from "react";
import { Plus, Shield, Users, Lock, Trash2, X, Loader2, RefreshCw, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import Badge from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { cn } from "../lib/utils";
import { api, type RoleListItem, type RoleDetail, type Permission, type ModuleListItem, type RouteListItem } from "../lib/api";
import { clearAccessibleModulesCache } from "../lib/auth";

const COLORS = ["purple", "blue", "green", "orange", "red", "teal"];
const colorMap: Record<string, string> = {
  purple: "bg-purple-500/10 text-purple-600 border-purple-200",
  blue:   "bg-blue-500/10 text-blue-600 border-blue-200",
  green:  "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  orange: "bg-orange-500/10 text-orange-600 border-orange-200",
  red:    "bg-red-500/10 text-red-600 border-red-200",
  teal:   "bg-teal-500/10 text-teal-600 border-teal-200",
};
const iconColor: Record<string, string> = {
  purple: "text-purple-500", blue: "text-blue-500", green: "text-emerald-500",
  orange: "text-orange-500", red: "text-red-500", teal: "text-teal-500",
};
function pickColor(idx: number) { return COLORS[idx % COLORS.length]; }

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  POST:   "bg-blue-500/10 text-blue-600 border-blue-200",
  PUT:    "bg-orange-500/10 text-orange-600 border-orange-200",
  PATCH:  "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  DELETE: "bg-red-500/10 text-red-600 border-red-200",
};

const emptyForm = { name: "", description: "", isActive: true };

export default function Roles() {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [selected, setSelected] = useState<RoleDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [allModules, setAllModules] = useState<ModuleListItem[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteListItem[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function loadRoles() {
    setLoadingList(true);
    api.roles.list().then(setRoles).catch(() => setLoadError("Failed to load roles")).finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadRoles();
    Promise.all([api.permissions.list(), api.modules.list(), api.routes.list()]).then(([perms, mods, routes]) => {
      setAllPermissions(perms);
      setAllModules(mods);
      setAllRoutes(routes);
    }).catch(() => setLoadError("Failed to load permissions or modules"));
  }, []);

  const selectRoleGen = useRef(0);

  function selectRole(r: RoleListItem) {
    const gen = ++selectRoleGen.current;
    setLoadingDetail(true);
    api.roles.detail(r.id).then(data => {
      if (gen === selectRoleGen.current) setSelected(data);
    }).catch(() => {
      if (gen === selectRoleGen.current) setLoadError("Failed to load role details");
    }).finally(() => {
      if (gen === selectRoleGen.current) setLoadingDetail(false);
    });
  }

  function openCreate() {
    setForm(emptyForm);
    setSelectedPerms([]);
    setFormError(null);
    setEditingRole(null);
    setModal(true);
  }

  function openEdit(role: RoleDetail) {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? "", isActive: role.isActive });
    setSelectedPerms(role.permissions.map(p => p.id));
    setFormError(null);
    setModal(true);
  }

  function togglePerm(id: number) {
    setSelectedPerms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  function toggleGroup(group: string) {
    setExpandedGroups(g => g.includes(group) ? g.filter(x => x !== group) : [...g, group]);
  }

  function toggleModulePerms(moduleName: string) {
    const ids = allPermissions.filter(p => p.groupName === moduleName).map(p => p.id);
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedPerms.includes(id));
    setSelectedPerms(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  }

  function toggleRoutePerm(code: string) {
    const p = allPermissions.find(p => p.code === code);
    if (p) togglePerm(p.id);
  }

  function toggleModuleExpand(name: string) {
    setExpandedModules(g => g.includes(name) ? g.filter(x => x !== name) : [...g, name]);
  }

  async function save() {
    setSaving(true); setFormError(null);
    try {
      if (editingRole) {
        await api.roles.update(editingRole.id, {
          name: form.name,
          description: form.description || null,
          isActive: form.isActive,
          permissionIds: selectedPerms,
        });
      } else {
        await api.roles.create({
          name: form.name, description: form.description || null,
          permissionIds: selectedPerms,
        });
      }
      clearAccessibleModulesCache();
      setModal(false);
      setEditingRole(null);
      loadRoles();
      if (editingRole) {
        api.roles.detail(editingRole.id).then(setSelected).catch(() => {});
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : (editingRole ? "Failed to update role" : "Failed to create role"));
    } finally { setSaving(false); }
  }

  async function deleteRole(id: number) {
    if (!confirm("Delete this role?")) return;
    try {
      await api.roles.delete(id);
      clearAccessibleModulesCache();
      setSelected(null);
      loadRoles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete role");
    }
  }

  const selectedIds = selected?.permissions.map(p => p.id) ?? [];
  const totalPerms = allPermissions.length;
  const coverage = totalPerms > 0 ? Math.round((selectedIds.length / totalPerms) * 100) : 0;

  // permission code → id lookup
  const permIdByCode = Object.fromEntries(allPermissions.map(p => [p.code, p.id]));

  const allModuleNodes = allModules.map(m => {
    const routes = allRoutes.filter(r => r.moduleId === m.id && r.isActive);
    const permIds = allPermissions.filter(p => p.groupName === m.name).map(p => p.id);
    return { module: m, routes, permIds };
  });

  // modules with permissions or routes (read-only panel)
  const moduleNodes = allModuleNodes.filter(x => x.permIds.length > 0 || x.routes.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Role List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Roles {!loadingList && `(${roles.length})`}
          </h2>
          <div className="flex gap-2">
            <button onClick={loadRoles} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 font-medium">
              <Plus className="w-3 h-3" /> New Role
            </button>
          </div>
        </div>

        {loadingList ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-500">{loadError}</p>
            <button onClick={loadRoles} className="mt-2 text-xs text-primary hover:underline">Retry</button>
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No roles found</div>
        ) : roles.map((role, idx) => {
          const color = pickColor(idx);
          return (
            <button key={role.id} onClick={() => selectRole(role)}
              className={cn("w-full text-left rounded-xl border p-4 transition-all",
                selected?.id === role.id ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/40 hover:bg-muted/30")}>
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg border flex-shrink-0", colorMap[color])}>
                  <Shield className={cn("w-4 h-4", iconColor[color])} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{role.name}</p>
                    {role.isSystem && <Badge variant="warning">System</Badge>}
                    {role.tenantName && <Badge variant="outline">{role.tenantName}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{role.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" /> {role.userCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" /> {role.permissionCount}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Permission Detail */}
      <div className="lg:col-span-2 space-y-4">
        {!selected && !loadingDetail ? (
          <div className="bg-card rounded-xl border flex items-center justify-center h-48 text-sm text-muted-foreground">
            Select a role to view permissions
          </div>
        ) : loadingDetail ? (
          <div className="bg-card rounded-xl border p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-2 w-full mt-4" />
          </div>
        ) : selected && (
          <>
            <div className="bg-card rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-foreground">{selected.name}</h2>
                    {selected.isSystem && <Badge variant="warning">System Role</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.description || "No description"}</p>
                </div>
                {!selected.isSystem && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(selected)}
                      className="p-2 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex-shrink-0">
                      <Pencil className="w-4 h-4 text-blue-500" />
                    </button>
                    <button onClick={() => deleteRole(selected.id)}
                      className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Permission Coverage</span>
                  <span className="text-xs font-semibold text-foreground">{coverage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${coverage}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selectedIds.length} of {totalPerms} permissions granted</p>
              </div>
            </div>

            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="text-sm font-semibold text-foreground">Module Access</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {moduleNodes.length === 0 ? (
                  <div className="px-5 py-4 space-y-2">
                    {selected.permissions.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0">✓</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                        <code className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
                      </div>
                    ))}
                    {selected.permissions.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">No permissions assigned</p>
                    )}
                  </div>
                ) : moduleNodes.map(({ module, routes, permIds }) => {
                  const routePermIds = routes.map(r => permIdByCode[r.requiredPermissionCode]).filter(Boolean) as number[];
                  const allModulePermIds = [...new Set([...permIds, ...routePermIds])];
                  const granted = allModulePermIds.filter(id => selectedIds.includes(id));
                  const isExpanded = expandedGroups.includes(module.name);
                  return (
                    <div key={module.id}>
                      <button onClick={() => toggleGroup(module.name)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground flex-shrink-0">{isExpanded ? "▼" : "▶"}</span>
                          <span className="text-sm font-medium text-foreground truncate">{module.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">({granted.length}/{allModulePermIds.length} permissions)</span>
                          {granted.length === allModulePermIds.length && <Badge variant="success">Full</Badge>}
                          {granted.length === 0 && <Badge variant="outline">None</Badge>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-3 space-y-1.5">
                          {routes.map(r => {
                            const permId = permIdByCode[r.requiredPermissionCode];
                            if (!permId) return null;
                            const has = selectedIds.includes(permId);
                            return (
                              <div key={r.id} className={cn("flex items-center gap-3 p-2 rounded-lg",
                                has ? "bg-emerald-50 border border-emerald-100" : "bg-muted/30")}>
                                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                                  has ? "bg-emerald-500 text-white" : "bg-muted border")}>
                                  {has && "✓"}
                                </span>
                                <span className={cn("inline-flex px-1.5 py-0.5 rounded text-xs font-mono font-semibold border",
                                  METHOD_COLORS[r.httpMethod] || "bg-muted text-muted-foreground")}>{r.httpMethod}</span>
                                <code className="text-xs font-mono text-foreground truncate">{r.routePattern}</code>
                                {r.description && <span className="text-xs text-muted-foreground truncate ml-auto">{r.description}</span>}
                              </div>
                            );
                          })}
                          {allPermissions.filter(p => p.groupName === module.name && !routePermIds.includes(p.id)).map(p => {
                            const has = selectedIds.includes(p.id);
                            return (
                              <div key={p.id} className={cn("flex items-center gap-3 p-2 rounded-lg",
                                has ? "bg-emerald-50 border border-emerald-100" : "bg-muted/30")}>
                                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                                  has ? "bg-emerald-500 text-white" : "bg-muted border")}>
                                  {has && "✓"}
                                </span>
                                <span className="text-xs text-foreground">{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Role Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{editingRole ? "Edit Role" : "Create Role"}</h2>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Role Name *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Branch Manager"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              {allModuleNodes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Module Access <span className="text-muted-foreground font-normal">({selectedPerms.length} permissions)</span>
                  </label>
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {allModuleNodes.map(({ module, routes, permIds }) => {
                  const routePermIds = routes.map(r => permIdByCode[r.requiredPermissionCode]).filter(x => x !== undefined) as number[];
                      const allModulePermIds = [...new Set([...permIds, ...routePermIds])];
                      const selectedCount = allModulePermIds.filter(id => selectedPerms.includes(id)).length;
                      const allSelected = allModulePermIds.length > 0 && selectedCount === allModulePermIds.length;
                      const isExpanded = expandedModules.includes(module.name);
                      return (
                        <div key={module.id}>
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <button type="button" onClick={() => toggleModuleExpand(module.name)}
                                className="text-muted-foreground hover:text-foreground p-0.5 flex-shrink-0">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <span className="text-xs font-semibold text-foreground truncate">{module.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{selectedCount}/{allModulePermIds.length}</span>
                            </div>
                            <button type="button" onClick={() => toggleModulePerms(module.name)}
                              className="text-xs text-primary hover:underline flex-shrink-0 ml-2">
                              {allSelected ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-2 pt-1 space-y-1">
                              {routes.map(r => {
                                const permId = permIdByCode[r.requiredPermissionCode];
                                if (!permId) return null;
                                const checked = selectedPerms.includes(permId);
                                return (
                                  <label key={r.id}
                                    className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors",
                                      checked ? "bg-emerald-50" : "hover:bg-muted/30")}>
                                    <input type="checkbox" checked={checked}
                                      onChange={() => toggleRoutePerm(r.requiredPermissionCode)} className="rounded" />
                                    <span className={cn("inline-flex px-1.5 py-0.5 rounded text-xs font-mono font-semibold border",
                                      METHOD_COLORS[r.httpMethod] || "bg-muted text-muted-foreground")}>{r.httpMethod}</span>
                                    <code className="text-xs font-mono text-foreground truncate">{r.routePattern}</code>
                                    {r.description && <span className="text-xs text-muted-foreground truncate ml-auto hidden sm:inline">{r.description}</span>}
                                  </label>
                                );
                              })}
                              {allPermissions.filter(p => p.groupName === module.name && !routePermIds.includes(p.id)).map(p => {
                                const checked = selectedPerms.includes(p.id);
                                return (
                                  <label key={p.id}
                                    className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors",
                                      checked ? "bg-emerald-50" : "hover:bg-muted/30")}>
                                    <input type="checkbox" checked={checked}
                                      onChange={() => togglePerm(p.id)} className="rounded" />
                                    <span className="text-xs text-foreground">{p.name}</span>
                                  </label>
                                );
                              })}
                              {routes.length === 0 && allPermissions.filter(p => p.groupName === module.name && !routePermIds.includes(p.id)).length === 0 && (
                                <div className="text-xs text-muted-foreground py-2 text-center">No pages or permissions</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {editingRole ? "Save Changes" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
