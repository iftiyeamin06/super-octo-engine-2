import { useEffect, useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import Badge from "../components/Badge";
import { api, type TenantListItem } from "../lib/api";

const empty = { name: "", code: "", description: "", contactEmail: "", subscriptionPlan: "", isActive: true };

export default function Tenants() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing?: TenantListItem }>({ open: false });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.tenants.list()
      .then(setTenants)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  function openCreate() {
    setForm(empty);
    setFormError(null);
    setModal({ open: true });
  }

  function openEdit(t: TenantListItem) {
    setForm({ name: t.name, code: t.code, description: t.description ?? "", contactEmail: t.contactEmail ?? "", subscriptionPlan: t.subscriptionPlan ?? "", isActive: t.isActive });
    setFormError(null);
    setModal({ open: true, editing: t });
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      if (modal.editing) await api.tenants.update(modal.editing.id, form);
      else await api.tenants.create(form);
      setModal({ open: false });
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTenant(id: number) {
    if (!confirm("Deactivate this tenant?")) return;
    await api.tenants.delete(id).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground">Manage organizations and their subscriptions</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Tenant
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Name", "Code", "Contact", "Plan", "Users", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No tenants found</td></tr>
              ) : tenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
                      <div>
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code></td>
                  <td className="px-4 py-3 text-muted-foreground">{t.contactEmail ?? "—"}</td>
                  <td className="px-4 py-3">{t.subscriptionPlan ? <Badge variant="outline">{t.subscriptionPlan}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.userCount}</td>
                  <td className="px-4 py-3">{t.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTenant(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{modal.editing ? "Edit Tenant" : "New Tenant"}</h2>
              <button onClick={() => setModal({ open: false })} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              {[
                { label: "Name *", key: "name", type: "text", placeholder: "Acme Corp" },
                { label: "Code *", key: "code", type: "text", placeholder: "ACME" },
                { label: "Contact Email", key: "contactEmail", type: "email", placeholder: "admin@acme.com" },
                { label: "Subscription Plan", key: "subscriptionPlan", type: "text", placeholder: "Enterprise" },
                { label: "Description", key: "description", type: "text", placeholder: "Optional description" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, unknown>)[key] as string} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}
              {modal.editing && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tActive" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                  <label htmlFor="tActive" className="text-sm text-foreground">Active</label>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal({ open: false })} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.code} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {modal.editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
