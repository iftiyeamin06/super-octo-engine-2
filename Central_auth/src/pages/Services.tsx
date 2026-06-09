import { useEffect, useState } from "react";
import { Globe, Plus, Key, Pencil, X, Loader2, Copy, Check, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import { api, type ServiceItem, type ApiServiceRoute, type Permission } from "../lib/api";

const emptyService = { name: "", code: "", description: "", baseUrl: "", isActive: true };
const emptyKey = { description: "", expiresAt: "" };

export default function Services() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: "service" | "key"; editing?: ServiceItem; serviceId?: number } | null>(null);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [keyForm, setKeyForm] = useState(emptyKey);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ id: number; description: string; expiresAt?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [routesMap, setRoutesMap] = useState<Record<number, ApiServiceRoute[]>>({});
  const [routesLoading, setRoutesLoading] = useState<Record<number, boolean>>({});
  const [routeModal, setRouteModal] = useState<{ type: "create" | "edit"; serviceId: number } | null>(null);
  const [routeForm, setRouteForm] = useState({ httpMethod: "GET", routePattern: "", requiredPermissionCode: "", description: "" });
  const [permissionsList, setPermissionsList] = useState<Permission[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([api.services.list(), api.permissions.list()])
      .then(([svcs, perms]) => { setServices(svcs); setPermissionsList(perms); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openCreateService() {
    setServiceForm(emptyService);
    setFormError(null);
    setModal({ type: "service" });
  }

  function openEditService(s: ServiceItem) {
    setServiceForm({ name: s.name, code: s.code, description: s.description ?? "", baseUrl: s.baseUrl ?? "", isActive: s.isActive });
    setFormError(null);
    setModal({ type: "service", editing: s });
  }

  function openAddKey(serviceId: number) {
    setKeyForm(emptyKey);
    setFormError(null);
    setNewKey(null);
    setModal({ type: "key", serviceId });
  }

  async function saveService() {
    setSaving(true); setFormError(null);
    try {
      if (modal?.editing) await api.services.update(modal.editing.id, serviceForm);
      else await api.services.create(serviceForm);
      setModal(null); load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function saveKey() {
    if (!modal?.serviceId) return;
    setSaving(true); setFormError(null);
    try {
      const result = await api.services.addApiKey(modal.serviceId, {
        description: keyForm.description,
        expiresAt: keyForm.expiresAt || null,
      });
      setNewKey(result);
      load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Failed to generate key"); }
    finally { setSaving(false); }
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function toggleExpand(serviceId: number) {
    if (expandedId === serviceId) { setExpandedId(null); return; }
    setExpandedId(serviceId);
    if (!routesMap[serviceId]) {
      setRoutesLoading(r => ({ ...r, [serviceId]: true }));
      api.apiServiceRoutes.list(serviceId)
        .then(routes => setRoutesMap(m => ({ ...m, [serviceId]: routes })))
        .catch(() => {})
        .finally(() => setRoutesLoading(r => ({ ...r, [serviceId]: false })));
    }
  }

  function openAddRoute(serviceId: number) {
    setRouteForm({ httpMethod: "GET", routePattern: "", requiredPermissionCode: "", description: "" });
    setFormError(null);
    setRouteModal({ type: "create", serviceId });
  }

  async function saveRoute() {
    if (!routeModal) return;
    setSaving(true); setFormError(null);
    try {
      await api.apiServiceRoutes.create({
        serviceId: routeModal.serviceId,
        httpMethod: routeForm.httpMethod,
        routePattern: routeForm.routePattern,
        requiredPermissionCode: routeForm.requiredPermissionCode,
        description: routeForm.description || null,
      });
      setRouteModal(null);
      const routes = await api.apiServiceRoutes.list(routeModal.serviceId);
      setRoutesMap(m => ({ ...m, [routeModal.serviceId]: routes }));
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Failed to save route"); }
    finally { setSaving(false); }
  }

  async function deleteRoute(serviceId: number, routeId: number) {
    try {
      await api.apiServiceRoutes.remove(routeId);
      const routes = await api.apiServiceRoutes.list(serviceId);
      setRoutesMap(m => ({ ...m, [serviceId]: routes }));
    } catch (_) { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Services & API Keys</h1>
          <p className="text-sm text-muted-foreground">Manage registered microservices and their API credentials</p>
        </div>
        <button onClick={openCreateService} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Register Service
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : services.length === 0 ? (
        <div className="bg-card border rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <Globe className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No services registered</p>
          <p className="text-xs text-muted-foreground mt-1">Register a microservice to generate API keys</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-card border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.code}</code>
                      {s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                    {s.baseUrl && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Base URL:</span> {s.baseUrl}</p>}
                    <p className="text-xs text-muted-foreground mt-1"><Key className="w-3 h-3 inline mr-1" />{s.apiKeyCount} active API {s.apiKeyCount === 1 ? "key" : "keys"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openAddKey(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
                    <Key className="w-3.5 h-3.5" /> Add API Key
                  </button>
                  <button onClick={() => openEditService(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Route expandable section */}
              <div className="mt-4 border-t pt-3">
                <button onClick={() => toggleExpand(s.id)} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {expandedId === s.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  API Routes ({routesMap[s.id]?.length ?? 0})
                </button>
                {expandedId === s.id && (
                  <div className="mt-3">
                    {routesLoading[s.id] ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <>
                        {(!routesMap[s.id] || routesMap[s.id].length === 0) ? (
                          <div className="text-xs text-muted-foreground text-center py-4">No routes registered</div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-2 pr-3 font-medium">Method</th>
                                <th className="text-left py-2 pr-3 font-medium">Route</th>
                                <th className="text-left py-2 pr-3 font-medium">Permission</th>
                                <th className="text-right py-2 font-medium"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {routesMap[s.id].map(route => (
                                <tr key={route.id} className="border-b last:border-0">
                                  <td className="py-2 pr-3">
                                    <span className={`font-mono font-semibold ${route.httpMethod === 'GET' ? 'text-emerald-600' : route.httpMethod === 'POST' ? 'text-blue-600' : route.httpMethod === 'PUT' ? 'text-amber-600' : 'text-red-600'}`}>{route.httpMethod}</span>
                                  </td>
                                  <td className="py-2 pr-3 font-mono">{route.routePattern}</td>
                                  <td className="py-2 pr-3"><code className="bg-muted px-1.5 py-0.5 rounded">{route.requiredPermissionCode}</code></td>
                                  <td className="py-2 text-right">
                                    <button onClick={() => deleteRoute(s.id, route.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete route"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <div className="mt-3">
                          <button onClick={() => openAddRoute(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"><Plus className="w-3 h-3" /> Add Route</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      {modal?.type === "service" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{modal.editing ? "Edit Service" : "Register Service"}</h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              {[
                { label: "Name *", key: "name", placeholder: "Order Service" },
                { label: "Code *", key: "code", placeholder: "ORDER_SVC" },
                { label: "Base URL", key: "baseUrl", placeholder: "https://api.example.com/orders" },
                { label: "Description", key: "description", placeholder: "Handles order management" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                  <input value={(serviceForm as Record<string, unknown>)[key] as string} onChange={(e) => setServiceForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveService} disabled={saving || !serviceForm.name || !serviceForm.code} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {modal.editing ? "Save" : "Register"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {modal?.type === "key" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Generate API Key</h2>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              {newKey ? (
                <div className="space-y-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-600 mb-1">API Key generated successfully</p>
                    <p className="text-xs text-muted-foreground">Copy this key now — it won't be shown again.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg break-all">{newKey.description} (ID: {newKey.id})</code>
                    <button onClick={() => copyKey(`key-id:${newKey.id}`)} className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Description *</label>
                    <input value={keyForm.description} onChange={(e) => setKeyForm(f => ({ ...f, description: e.target.value }))} placeholder="Production key for Order Service"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Expires At (optional)</label>
                    <input type="datetime-local" value={keyForm.expiresAt} onChange={(e) => setKeyForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">{newKey ? "Close" : "Cancel"}</button>
              {!newKey && (
                <button onClick={saveKey} disabled={saving || !keyForm.description} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Generate Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Modal */}
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
                <input list="permission-codes" value={routeForm.requiredPermissionCode} onChange={e => setRouteForm(f => ({ ...f, requiredPermissionCode: e.target.value }))} placeholder="ActiveInventory_FullAccess"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <datalist id="permission-codes">
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
