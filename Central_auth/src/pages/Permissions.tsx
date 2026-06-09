import { useEffect, useState } from "react";
import { Lock, Search, Plus, X, Loader2, Trash2, RefreshCw } from "lucide-react";
import Badge from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { api, type Permission, type CreatePermissionPayload, type ModuleListItem } from "../lib/api";

const emptyForm = { code: "", name: "", description: "", groupName: "" };

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [modules, setModules] = useState<ModuleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    Promise.all([api.permissions.list(), api.modules.list()])
      .then(([perms, mods]) => { setPermissions(perms); setModules(mods); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function createPermission() {
    setSaving(true); setFormError(null);
    try {
      const payload: CreatePermissionPayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        groupName: form.groupName.trim() || null,
      };
      await api.permissions.create(payload);
      setModal(false);
      loadData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create permission");
    } finally { setSaving(false); }
  }

  async function deletePermission(p: Permission) {
    if (!confirm(`Delete permission "${p.name}" (${p.code})?`)) return;
    await api.permissions.remove(p.id).catch(() => {});
    loadData();
  }

  const filtered = permissions.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchGroup = groupFilter === "all" || p.groupName === groupFilter;
    return matchSearch && matchGroup;
  });

  const grouped = modules.map(mod => ({
    group: mod.name,
    perms: filtered.filter(p => p.groupName === mod.name),
  })).filter(g => g.perms.length > 0);

  const ungrouped = filtered.filter(p => !p.groupName);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Permissions</h1>
        <p className="text-sm text-muted-foreground">System-defined permission codes assigned to roles</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions…"
            className="pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-56" />
        </div>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="all">All groups</option>
          {modules.map(mod => <option key={mod.id} value={mod.name}>{mod.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} permissions</span>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={loadData} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setForm(emptyForm); setFormError(null); setModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 font-medium">
            <Plus className="w-3 h-3" /> New Permission
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-12 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ group, perms }) => (
            <div key={group} className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                <span className="text-xs text-muted-foreground">{perms.length} permissions</span>
              </div>
              <div className="p-3 grid gap-2">
                {perms.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    {!p.isSystem && (
                      <button onClick={() => deletePermission(p)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.isSystem && <Badge variant="warning">System</Badge>}
                      {p.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Ungrouped</h3>
              </div>
              <div className="p-3 grid gap-2">
                {ungrouped.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    {!p.isSystem && (
                      <button onClick={() => deletePermission(p)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.isSystem && <Badge variant="warning">System</Badge>}
                      {p.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No permissions match your search</div>
          )}
        </div>
      )}

      {/* Create Permission Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Create Permission</h2>
              <button onClick={() => setModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Code *</label>
                <input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. HR_FullAccess"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. HR Module Full Access"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Group</label>
                <select value={form.groupName} onChange={(e) => setForm(f => ({ ...f, groupName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">No group</option>
                  {modules.map(mod => <option key={mod.id} value={mod.name}>{mod.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={createPermission} disabled={saving || !form.code || !form.name}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Permission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
