import { useEffect, useState } from "react";
import { Globe, Plus, Key, Pencil, X, Loader2, Copy, Check } from "lucide-react";
import Badge from "../components/Badge";
import { api, type ServiceItem } from "../lib/api";

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

  const load = () => {
    setLoading(true);
    api.services.list().then(setServices).catch(() => {}).finally(() => setLoading(false));
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
    </div>
  );
}
