import { useEffect, useState } from "react";
import { Plus, Shield, Users, Lock, Trash2, X, Loader2, RefreshCw } from "lucide-react";
import Badge from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { cn } from "../lib/utils";
import { api, type RoleListItem, type RoleDetail, type Permission } from "../lib/api";

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

const emptyForm = { name: "", description: "", tenantId: "" };

export default function Roles() {
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [selected, setSelected] = useState<RoleDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permGroups, setPermGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadRoles() {
    setLoadingList(true);
    api.roles.list().then(setRoles).catch(() => {}).finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadRoles();
    Promise.all([api.permissions.list(), api.permissions.groups()]).then(([perms, groups]) => {
      setAllPermissions(perms);
      setPermGroups(groups);
      setExpandedGroups(groups.slice(0, 3));
    }).catch(() => {});
  }, []);

  function selectRole(r: RoleListItem) {
    setLoadingDetail(true);
    api.roles.detail(r.id).then(setSelected).catch(() => {}).finally(() => setLoadingDetail(false));
  }

  function openCreate() {
    setForm(emptyForm);
    setSelectedPerms([]);
    setFormError(null);
    setModal(true);
  }

  function togglePerm(id: number) {
    setSelectedPerms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }

  function toggleGroup(group: string) {
    setExpandedGroups(g => g.includes(group) ? g.filter(x => x !== group) : [...g, group]);
  }

  async function save() {
    setSaving(true); setFormError(null);
    try {
      await api.roles.create({
        name: form.name, description: form.description || null,
        tenantId: form.tenantId ? Number(form.tenantId) : null,
        permissionIds: selectedPerms,
      });
      setModal(false);
      loadRoles();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create role");
    } finally { setSaving(false); }
  }

  async function deleteRole(id: number) {
    if (!confirm("Delete this role?")) return;
    await api.roles.delete(id).catch(() => {});
    setSelected(null);
    loadRoles();
  }

  // derive groups: use server-provided groups, fall back to code prefix
  const effectiveGroups = permGroups.length > 0
    ? permGroups
    : [...new Set(allPermissions.map(p => p.groupName ?? p.code.split('.')[0]))];

  const groupedPerms = effectiveGroups.map(g => ({
    group: g,
    perms: allPermissions.filter(p => (p.groupName ?? p.code.split('.')[0]) === g),
  }));

  const selectedIds = selected?.permissions.map(p => p.id) ?? [];
  const totalPerms = allPermissions.length;
  const coverage = totalPerms > 0 ? Math.round((selectedIds.length / totalPerms) * 100) : 0;

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
                  <button onClick={() => deleteRole(selected.id)}
                    className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
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
                <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {groupedPerms.length === 0 ? (
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
                ) : groupedPerms.filter(g => g.perms.length > 0).map(({ group, perms }) => {
                  const granted = perms.filter(p => selectedIds.includes(p.id));
                  const isExpanded = expandedGroups.includes(group);
                  return (
                    <div key={group}>
                      <button onClick={() => toggleGroup(group)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{group}</span>
                          <span className="text-xs text-muted-foreground">({granted.length}/{perms.length})</span>
                          {granted.length === perms.length && <Badge variant="success">Full</Badge>}
                          {granted.length === 0 && <Badge variant="outline">None</Badge>}
                        </div>
                        <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-3 space-y-2">
                          {perms.map(p => {
                            const has = selectedIds.includes(p.id);
                            return (
                              <div key={p.id} className={cn("flex items-center gap-3 p-3 rounded-lg border",
                                has ? "bg-emerald-50 border-emerald-100" : "bg-muted/30 border-transparent")}>
                                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                                  has ? "bg-emerald-500 text-white" : "bg-muted border")}>
                                  {has && "✓"}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">{p.description}</p>
                                </div>
                                <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
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

      {/* Create Role Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Create Role</h2>
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

              {allPermissions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-2">
                    Permissions <span className="text-muted-foreground font-normal">({selectedPerms.length} selected)</span>
                  </label>
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {groupedPerms.filter(g => g.perms.length > 0).map(({ group, perms }) => (
                      <div key={group}>
                        <div className="px-3 py-2 bg-muted/30 flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</span>
                          <button type="button" onClick={() => {
                            const ids = perms.map(p => p.id);
                            const allSelected = ids.every(id => selectedPerms.includes(id));
                            setSelectedPerms(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
                          }} className="text-xs text-primary hover:underline">
                            {perms.every(p => selectedPerms.includes(p.id)) ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        {perms.map(p => (
                          <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                            <input type="checkbox" checked={selectedPerms.includes(p.id)}
                              onChange={() => togglePerm(p.id)} className="rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
