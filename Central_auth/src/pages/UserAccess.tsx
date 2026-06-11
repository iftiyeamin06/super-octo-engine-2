import { useEffect, useState } from "react";
import { ShieldCheck, Route, Blocks, Search, ChevronDown, ChevronRight, Loader2, Check } from "lucide-react";
import Badge from "../components/Badge";
import { cn } from "../lib/utils";
import { api, type UserListItem, type RoleListItem, type ModuleListItem, type RouteListItem } from "../lib/api";
import { clearAccessibleModulesCache } from "../lib/auth";

const USER_PAGE_SIZE = 100;

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  POST:   "bg-blue-500/10 text-blue-600 border-blue-200",
  PUT:    "bg-orange-500/10 text-orange-600 border-orange-200",
  PATCH:  "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  DELETE: "bg-red-500/10 text-red-600 border-red-200",
};

export default function UserAccess() {
  // Shared data
  const [modules, setModules] = useState<ModuleListItem[]>([]);
  const [allRoles, setAllRoles] = useState<RoleListItem[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User selector
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  // Roles
  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);

  // Direct Module Access
  const [directModuleIds, setDirectModuleIds] = useState<number[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleSuccess, setModuleSuccess] = useState(false);

  // Page Access
  const [directRouteIds, setDirectRouteIds] = useState<number[]>([]);
  const [pageSearch, setPageSearch] = useState("");
  const [pageSaving, setPageSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Load shared data
  useEffect(() => {
    Promise.all([
      api.modules.list(),
      api.roles.list(),
      api.users.list({ page: "1", pageSize: String(USER_PAGE_SIZE), status: "all" }),
      api.routes.list(),
    ]).then(([mods, roles, userResult, routes]) => {
      setModules(mods);
      setAllRoles(roles);
      setUsers(userResult.items);
      setAllRoutes(routes);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Shared ───────────────────────────────────────────────────────────
  function selectUser(user: UserListItem) {
    setSelectedUser(user);
    setShowUserDropdown(false);
    setRoleError(null); setRoleSuccess(false);
    setModuleError(null); setModuleSuccess(false);
    setPageError(null); setPageSuccess(false);
    setUserRoleIds(allRoles.filter(r => user.roles.includes(r.name)).map(r => r.id));
    api.users.moduleAccesses(user.id).then(setDirectModuleIds).catch(() => {});
    api.users.routeAccesses(user.id).then(setDirectRouteIds).catch(() => {});
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  function userDisplayName(u: UserListItem): string {
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  }

  // ── Roles ─────────────────────────────────────────────────────────────
  function toggleUserRole(roleId: number) {
    setUserRoleIds(p => p.includes(roleId) ? p.filter(x => x !== roleId) : [...p, roleId]);
  }

  async function saveUserRoles() {
    if (!selectedUser) return;
    setRoleSaving(true); setRoleError(null); setRoleSuccess(false);
    try {
      await api.users.updateRoles(selectedUser.id, userRoleIds);
      setRoleSuccess(true);
      setTimeout(() => setRoleSuccess(false), 3000);
    } catch (e: unknown) {
      setRoleError(e instanceof Error ? e.message : "Failed to save roles");
    } finally { setRoleSaving(false); }
  }

  // ── Direct Module Access ─────────────────────────────────────────────
  function toggleModule(id: number) {
    setDirectModuleIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  async function saveModuleAccesses() {
    if (!selectedUser) return;
    setModuleSaving(true); setModuleError(null); setModuleSuccess(false);
    try {
      await api.users.updateModuleAccesses(selectedUser.id, directModuleIds);
      clearAccessibleModulesCache();
      setModuleSuccess(true);
      setTimeout(() => setModuleSuccess(false), 3000);
    } catch (e: unknown) {
      setModuleError(e instanceof Error ? e.message : "Failed to save module access");
    } finally { setModuleSaving(false); }
  }

  // ── Page Access ──────────────────────────────────────────────────────
  const routesByModule = modules
    .map(m => ({
      module: m,
      routes: allRoutes.filter(r => r.moduleId === m.id),
    }))
    .filter(x => x.routes.length > 0);

  function toggleRoute(id: number) {
    setDirectRouteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  function toggleAllModuleRoutes(routes: RouteListItem[], checked: boolean) {
    const ids = routes.map(r => r.id);
    setDirectRouteIds(p => checked
      ? [...new Set([...p, ...ids])]
      : p.filter(x => !ids.includes(x))
    );
  }

  async function savePageAccesses() {
    if (!selectedUser) return;
    setPageSaving(true); setPageError(null); setPageSuccess(false);
    try {
      await api.users.updateRouteAccesses(selectedUser.id, directRouteIds);
      clearAccessibleModulesCache();
      setPageSuccess(true);
      setTimeout(() => setPageSuccess(false), 3000);
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : "Failed to save page access");
    } finally { setPageSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">User Access</h1>
        <p className="text-sm text-muted-foreground">Configure roles, module access, and page-level permissions for a user</p>
      </div>

      {/* ── User Selector (shared, above all sections) ─────────────── */}
      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
            onFocus={() => setShowUserDropdown(true)} placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {showUserDropdown && filteredUsers.length > 0 && (
          <div className="bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredUsers.slice(0, 20).map(u => (
              <button key={u.id} onClick={() => selectUser(u)}
                className={cn("w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors",
                  selectedUser?.id === u.id && "bg-primary/5 text-primary")}>
                <p className="font-medium">{userDisplayName(u)}</p>
                <p className="text-xs text-muted-foreground">{u.email} {u.roles?.length ? `· ${u.roles.join(', ')}` : ''}</p>
              </button>
            ))}
          </div>
        )}
        {showUserDropdown && filteredUsers.length === 0 && (
          <div className="bg-card border rounded-lg p-4 text-sm text-muted-foreground text-center">No users found</div>
        )}
        {showUserDropdown && (
          <button onClick={() => setShowUserDropdown(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        )}

        {!selectedUser ? (
          <div className="text-sm text-muted-foreground text-center py-6">Select a user to manage access permissions</div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {userDisplayName(selectedUser).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{userDisplayName(selectedUser)}</p>
              <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
            </div>
            {selectedUser.roles?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUser.roles.map(r => <Badge key={r} variant="outline">{r}</Badge>)}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedUser && !loading && (
        <>
          {/* ── Section 1: Roles & Permissions ──────────────────────── */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Roles & Permissions</h2>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {selectedUser.roles?.length > 0 ? selectedUser.roles.map(r => <Badge key={r} variant="outline">{r}</Badge>)
                  : <span className="text-xs text-muted-foreground">No roles assigned</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{userRoleIds.length}/{allRoles.length} selected</span>
                {roleSuccess && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                <button onClick={saveUserRoles} disabled={roleSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 font-medium disabled:opacity-50">
                  {roleSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
            {roleError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{roleError}</div>}

            <div className="divide-y rounded-lg border max-h-64 overflow-y-auto">
              {allRoles.filter(r => r.isActive).map(r => {
                const checked = userRoleIds.includes(r.id);
                return (
                  <label key={r.id}
                    className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                      checked ? "bg-emerald-50" : "hover:bg-muted/30")}>
                    <input type="checkbox" checked={checked} onChange={() => toggleUserRole(r.id)} className="rounded" />
                    <span className="text-sm text-foreground">{r.name}</span>
                    {r.isSystem && <Badge variant="warning">System</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{r.permissionCount} perms</span>
                  </label>
                );
              })}
              {allRoles.filter(r => r.isActive).length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">No roles available</div>
              )}
            </div>
          </div>

          {/* ── Section 2: Direct Module Access ──────────────────────── */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Blocks className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Direct Module Access</h2>
            </div>

            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Filter modules…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{directModuleIds.length}/{modules.length} selected</span>
                {moduleSuccess && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                <button onClick={saveModuleAccesses} disabled={moduleSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 font-medium disabled:opacity-50">
                  {moduleSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
            {moduleError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{moduleError}</div>}

            <div className="divide-y rounded-lg border max-h-64 overflow-y-auto">
              {modules.filter(m => !moduleSearch || m.name.toLowerCase().includes(moduleSearch.toLowerCase())).map(m => {
                const checked = directModuleIds.includes(m.id);
                return (
                  <label key={m.id}
                    className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                      checked ? "bg-emerald-50" : "hover:bg-muted/30")}>
                    <input type="checkbox" checked={checked} onChange={() => toggleModule(m.id)} className="rounded" />
                    <span className="text-sm text-foreground">{m.name}</span>
                    {m.parentId && <Badge variant="outline">sub</Badge>}
                  </label>
                );
              })}
              {modules.filter(m => !moduleSearch || m.name.toLowerCase().includes(moduleSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">No modules match your filter</div>
              )}
            </div>
          </div>

          {/* ── Section 3: Page Access ────────────────────────────────── */}
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Page Access</h2>
            </div>

            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Filter routes…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{directRouteIds.length}/{allRoutes.length} selected</span>
                {pageSuccess && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                <button onClick={savePageAccesses} disabled={pageSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 font-medium disabled:opacity-50">
                  {pageSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
            {pageError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{pageError}</div>}

            <div className="divide-y rounded-lg border">
              {routesByModule.filter(({ module: m, routes }) =>
                !pageSearch || m.name.toLowerCase().includes(pageSearch.toLowerCase()) ||
                routes.some(r => r.routePattern.toLowerCase().includes(pageSearch.toLowerCase()))
              ).map(({ module: m, routes }) => {
                const allSelected = routes.every(r => directRouteIds.includes(r.id));
                const isExpanded = expandedModules.includes(m.name);
                return (
                  <div key={m.id}>
                    <button onClick={() => setExpandedModules(p => p.includes(m.name) ? p.filter(x => x !== m.name) : [...p, m.name])}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-sm font-medium text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground">({routes.filter(r => directRouteIds.includes(r.id)).length}/{routes.length})</span>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleAllModuleRoutes(routes, !allSelected); }}
                        className="text-xs text-primary hover:underline">{allSelected ? "Deselect all" : "Select all"}</button>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-2.5 space-y-1">
                        {routes.map(r => {
                          const checked = directRouteIds.includes(r.id);
                          return (
                            <label key={r.id}
                              className={cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                checked ? "bg-emerald-50 border border-emerald-100" : "hover:bg-muted/30")}>
                              <input type="checkbox" checked={checked} onChange={() => toggleRoute(r.id)} className="rounded" />
                              <span className={cn("inline-flex px-1.5 py-0.5 rounded text-xs font-mono font-semibold border",
                                METHOD_COLORS[r.httpMethod] || "bg-muted text-muted-foreground")}>{r.httpMethod}</span>
                              <div className="flex-1 min-w-0">
                                <code className="text-xs font-mono text-foreground">{r.routePattern}</code>
                                <p className="text-xs text-muted-foreground truncate">{r.description || r.requiredPermissionCode}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {routesByModule.filter(({ module: m, routes }) =>
                !pageSearch || m.name.toLowerCase().includes(pageSearch.toLowerCase()) ||
                routes.some(r => r.routePattern.toLowerCase().includes(pageSearch.toLowerCase()))
              ).length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  {allRoutes.length === 0 ? "No routes registered. Add routes in the Modules page first." : "No routes match your filter"}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
