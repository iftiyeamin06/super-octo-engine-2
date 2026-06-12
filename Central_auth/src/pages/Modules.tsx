import { useEffect, useMemo, useState } from "react";
import { Boxes, ChevronDown, ChevronRight, Loader2, Pencil, Play, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { api, type ModuleListItem, type ModuleSavePayload, type ModuleRouteItem, type Permission } from "../lib/api";
import { getSession, clearAccessibleModulesCache } from "../lib/auth";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

export default function Modules() {
  const [items, setItems] = useState<ModuleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", code: "", parentId: "", sortOrder: "0", icon: "", route: "", isActive: true,
  });

  // ── Routes state ──────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [routesMap, setRoutesMap] = useState<Record<number, ModuleRouteItem[]>>({});
  const [routesLoading, setRoutesLoading] = useState<Record<number, boolean>>({});
  const [routeModal, setRouteModal] = useState<{ moduleId: number } | null>(null);
  const [routeForm, setRouteForm] = useState({ httpMethod: "GET", routePattern: "", requiredPermissionCode: "", description: "" });
  const [permissionsList, setPermissionsList] = useState<Permission[]>([]);
  const [testResults, setTestResults] = useState<Record<number, { status: number | null; loading: boolean }>>({});

  const parentOptions = useMemo(
    () => items.filter((item) => item.id !== editingId),
    [editingId, items],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
  }, [items, search]);

  const tree = useMemo(() => {
    const top = filtered.filter(m => !m.parentId).sort((a, b) => a.name.localeCompare(b.name));
    return top.map(p => ({
      parent: p,
      children: filtered.filter(c => c.parentId === p.id).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [filtered]);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.modules.list(), api.permissions.list()])
      .then(([mods, perms]) => { setItems(mods); setPermissionsList(perms); setLoadError(null); })
      .catch(() => setLoadError("Failed to load modules")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setFormError(null);
    setForm({ name: "", code: "", parentId: "", sortOrder: "0", icon: "", route: "", isActive: true });
    setModalOpen(true);
  }

  async function openEdit(id: number) {
    setModalOpen(true);
    setFormError(null);
    setDetailLoading(true);
    try {
      const module = await api.modules.detail(id);
      setEditingId(id);
      setForm({
        name: module.name, code: module.code, parentId: module.parentId ? String(module.parentId) : "",
        sortOrder: String(module.sortOrder ?? 0), icon: module.icon ?? "", route: module.route, isActive: module.isActive,
      });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to load module");
    } finally { setDetailLoading(false); }
  }

  function closeModal() {
    setModalOpen(false); setEditingId(null); setFormError(null);
    setDetailLoading(false); setSaving(false);
  }

  async function save() {
    setSaving(true); setFormError(null);
    const payload: ModuleSavePayload = {
      name: form.name, code: form.code, parentId: form.parentId ? Number(form.parentId) : null,
      sortOrder: Number(form.sortOrder || 0), icon: form.icon || null, route: form.route, isActive: form.isActive,
    };
    try {
      if (editingId) await api.modules.update(editingId, payload);
      else await api.modules.create(payload);
      closeModal(); load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function confirmDelete(id: number) {
    try { await api.modules.remove(id); setDeleteConfirm(null); load(); }
    catch (e: unknown) { setLoadError(e instanceof Error ? e.message : "Failed to delete module"); }
  }

  // ── Permission modal ──────────────────────────────────────────────
  const [permModalId, setPermModalId] = useState<number | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permSearch, setPermSearch] = useState("");
  const [permError, setPermError] = useState<string | null>(null);

  async function openPermModal(id: number) {
    setPermModalId(id); setPermLoading(true); setPermSearch(""); setPermError(null);
    try {
      const [perms, assigned] = await Promise.all([api.permissions.list(), api.modules.permissions(id)]);
      setAllPermissions(perms); setSelectedPerms(assigned);
    } catch (e: unknown) {
      setPermError(e instanceof Error ? e.message : "Failed to load permissions");
    }
    finally { setPermLoading(false); }
  }

  function togglePerm(pid: number) { setSelectedPerms(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]); }

  async function savePerms() {
    if (!permModalId) return;
    setPermSaving(true); setPermError(null);
    try {
      await api.modules.updatePermissions(permModalId, selectedPerms);
      clearAccessibleModulesCache();
      setPermModalId(null);
    } catch (e: unknown) {
      setPermError(e instanceof Error ? e.message : "Failed to save permissions");
    }
    finally { setPermSaving(false); }
  }

  // ── Route expand/collapse ─────────────────────────────────────────
  function toggleExpand(moduleId: number) {
    if (expandedId === moduleId) { setExpandedId(null); return; }
    setExpandedId(moduleId);
    if (!routesMap[moduleId]) {
      setRoutesLoading(r => ({ ...r, [moduleId]: true }));
      api.modules.routes.list(moduleId)
        .then(routes => setRoutesMap(m => ({ ...m, [moduleId]: routes })))
        .catch(() => setLoadError("Failed to load routes"))
        .finally(() => setRoutesLoading(r => ({ ...r, [moduleId]: false })));
    }
  }

  function openAddRoute(moduleId: number) {
    setRouteForm({ httpMethod: "GET", routePattern: "", requiredPermissionCode: "", description: "" });
    setFormError(null);
    setRouteModal({ moduleId });
  }

  async function saveRoute() {
    if (!routeModal) return;
    setSaving(true); setFormError(null);
    try {
      const moduleId = routeModal.moduleId;
      await api.modules.routes.create(moduleId, routeForm);
      setRouteModal(null);
      const routes = await api.modules.routes.list(moduleId);
      setRoutesMap(m => ({ ...m, [moduleId]: routes }));
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Failed to save route"); }
    finally { setSaving(false); }
  }

  async function deleteRoute(moduleId: number, routeId: number) {
    try {
      await api.modules.routes.remove(moduleId, routeId);
      const routes = await api.modules.routes.list(moduleId);
      setRoutesMap(m => ({ ...m, [moduleId]: routes }));
    } catch (e: unknown) { setLoadError(e instanceof Error ? e.message : "Failed to delete route"); }
  }

  async function testRoute(route: ModuleRouteItem) {
    setTestResults(p => ({ ...p, [route.id]: { status: null, loading: true } }));
    try {
      const session = getSession();
      if (!session?.token) throw new Error("No token");
      const res = await fetch(`/api${route.routePattern}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setTestResults(p => ({ ...p, [route.id]: { status: res.status, loading: false } }));
    } catch {
      setTestResults(p => ({ ...p, [route.id]: { status: 0, loading: false } }));
    }
  }

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'text-emerald-600';
      case 'POST': return 'text-blue-600';
      case 'PUT': return 'text-amber-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Modules</h1>
          <p className="text-sm text-muted-foreground">Browse and maintain module records</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Create Module
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : loadError ? (
        <div className="bg-card border rounded-xl p-6 text-center">
          <p className="text-sm text-red-500">{loadError}</p>
          <button onClick={load} className="mt-2 text-xs text-primary hover:underline">Retry</button>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules by name or code..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">IsActive</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">CreatedAt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">UpdatedAt</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tree.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No modules found</td></tr>
                ) : tree.flatMap(({ parent, children }) => [
                  <tr key={parent.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleExpand(parent.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground">
                          {expandedId === parent.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{parent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{parent.code}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{parent.route}</td>
                    <td className="px-4 py-3">{parent.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(parent.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(parent.updatedAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {deleteConfirm === parent.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Delete?</span>
                          <button onClick={() => confirmDelete(parent.id)} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-medium">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs">No</button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button onClick={() => openEdit(parent.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openPermModal(parent.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Manage Permissions"><ShieldCheck className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(parent.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </span>
                      )}
                    </td>
                  </tr>,
                  // Expanded route rows for parent
                  ...(expandedId === parent.id ? [
                    <tr key={`routes-${parent.id}`}>
                      <td colSpan={7} className="px-4 py-3 bg-muted/20">
                        {routesLoading[parent.id] ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                        ) : (
                          <div className="space-y-3">
                            {(!routesMap[parent.id] || routesMap[parent.id].length === 0) ? (
                              <p className="text-xs text-muted-foreground text-center py-2">No routes registered</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-1.5 pr-3 font-medium">Method</th>
                                    <th className="text-left py-1.5 pr-3 font-medium">Route</th>
                                    <th className="text-left py-1.5 pr-3 font-medium">Permission</th>
                                    <th className="text-right py-1.5 font-medium"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {routesMap[parent.id].map(route => {
                                    const tr = testResults[route.id];
                                    return (
                                    <tr key={route.id} className="border-b last:border-0">
                                      <td className="py-1.5 pr-3"><span className={`font-mono font-semibold ${methodColor(route.httpMethod)}`}>{route.httpMethod}</span></td>
                                      <td className="py-1.5 pr-3 font-mono">{route.routePattern}</td>
                                      <td className="py-1.5 pr-3"><code className="bg-muted px-1.5 py-0.5 rounded">{route.requiredPermissionCode}</code></td>
                                      <td className="py-1.5 text-right whitespace-nowrap">
                                        {tr?.loading ? (
                                          <Loader2 className="w-3 h-3 animate-spin inline-block mr-2 text-muted-foreground" />
                                        ) : tr?.status != null ? (
                                          <span
                                            className={`inline-flex items-center gap-1 mr-2 text-xs font-semibold ${tr.status === 200 ? 'text-emerald-600' : 'text-red-500'}`}
                                            title={tr.status === 403 ? `Missing: ${route.requiredPermissionCode}` : tr.status === 0 ? "Network error" : undefined}
                                          >
                                            {tr.status === 200 ? '✅' : '❌'} {tr.status === 0 ? 'Network error' : tr.status}
                                          </span>
                                        ) : null}
                                        <button onClick={() => testRoute(route)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Test this route"><Play className="w-3 h-3" /></button>
                                        <button onClick={() => deleteRoute(parent.id, route.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete route"><Trash2 className="w-3 h-3" /></button>
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                            <button onClick={() => openAddRoute(parent.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"><Plus className="w-3 h-3" /> Add Route</button>
                          </div>
                        )}
                      </td>
                    </tr>,
                  ] : []),
                  ...children.map(child => (
                    <tr key={child.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 pl-8">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">└─</span>
                          <div className="w-6 h-6 rounded-lg bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                            <Boxes className="w-3 h-3" />
                          </div>
                          <span className="text-sm text-foreground">{child.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{child.code}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{child.route}</td>
                      <td className="px-4 py-3">{child.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(child.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(child.updatedAt)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {deleteConfirm === child.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Delete?</span>
                            <button onClick={() => confirmDelete(child.id)} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-medium">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs">No</button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => openEdit(child.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openPermModal(child.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Manage Permissions"><ShieldCheck className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteConfirm(child.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </span>
                        )}
                      </td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create/Edit modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{editingId ? "Edit Module" : "Create Module"}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {(formError || detailLoading) && (
                <div className={formError ? "text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2" : "text-xs text-muted-foreground bg-muted rounded px-3 py-2"}>
                  {formError ?? "Loading module data..."}
                </div>
              )}
              {[{ label: "Name *", key: "name", placeholder: "Catalog" }, { label: "Code *", key: "code", placeholder: "CATALOG" }, { label: "Route *", key: "route", placeholder: "/Catalog" }, { label: "Icon", key: "icon", placeholder: "boxes" }].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                  <input value={form[key as keyof typeof form] as string} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Parent Module</label>
                  <select value={form.parentId} onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    <option value="">No parent</option>
                    {parentOptions.map((item) => (<option key={item.id} value={item.id}>{item.name} ({item.code})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Sort Order *</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 rounded border bg-background accent-primary" />
                Is Active
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || detailLoading || !form.name || !form.code || !form.route}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? "Save Changes" : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permission modal ───────────────────────────────────────────── */}
      {permModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Manage Permissions</h2>
              <button onClick={() => { setPermModalId(null); setPermSearch(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Search permissions by name or code..."
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
            {permError && (
              <div className="px-4 pt-3">
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{permError}</div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {permLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : allPermissions.filter(p => {
                if (!permSearch.trim()) return true;
                const q = permSearch.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
              }).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No permissions found</p>
              ) : allPermissions.filter(p => {
                if (!permSearch.trim()) return true;
                const q = permSearch.toLowerCase();
                return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
              }).map(p => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)}
                    className="h-4 w-4 rounded border bg-background accent-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <span className="text-xs text-muted-foreground mr-auto">{selectedPerms.length} selected</span>
              <button onClick={() => { setPermModalId(null); setPermSearch(""); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={savePerms} disabled={permSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {permSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Route modal ────────────────────────────────────────────────── */}
      {routeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Add API Route</h2>
              <button onClick={() => setRouteModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">HTTP Method *</label>
                <select value={routeForm.httpMethod} onChange={e => setRouteForm(f => ({ ...f, httpMethod: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                  {["GET","POST","PUT","DELETE","PATCH"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Route Pattern *</label>
                <input value={routeForm.routePattern} onChange={e => setRouteForm(f => ({ ...f, routePattern: e.target.value }))} placeholder="/api/inventory"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Required Permission Code *</label>
                <input list="route-permission-codes" value={routeForm.requiredPermissionCode} onChange={e => setRouteForm(f => ({ ...f, requiredPermissionCode: e.target.value }))} placeholder="Inventory_FullAccess"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <datalist id="route-permission-codes">
                  {permissionsList.map(p => <option key={p.id} value={p.code}>{p.name}</option>)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <input value={routeForm.description} onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setRouteModal(null)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveRoute} disabled={saving || !routeForm.httpMethod || !routeForm.routePattern || !routeForm.requiredPermissionCode}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
