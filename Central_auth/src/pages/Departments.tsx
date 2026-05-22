import { useEffect, useState } from "react";
import { Building, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { api, type DepartmentItem, type TenantListItem } from "../lib/api";

const empty = { name: "", description: "", tenantId: "", isActive: true };

export default function Departments() {
  const [items, setItems] = useState<DepartmentItem[]>([]);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing?: DepartmentItem }>({ open: false });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.departments.list(tenantFilter ? Number(tenantFilter) : undefined)
      .then(setItems).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tenantFilter]);
  useEffect(() => { api.tenants.list().then(setTenants).catch(() => {}); }, []);

  function openCreate() { setForm(empty); setFormError(null); setModal({ open: true }); }
  function openEdit(d: DepartmentItem) {
    setForm({ name: d.name, description: d.description ?? "", tenantId: d.tenantId ? String(d.tenantId) : "", isActive: d.isActive });
    setFormError(null);
    setModal({ open: true, editing: d });
  }

  async function save() {
    setSaving(true); setFormError(null);
    try {
      const data = { name: form.name, description: form.description || null, tenantId: form.tenantId ? Number(form.tenantId) : null, isActive: form.isActive };
      if (modal.editing) await api.departments.update(modal.editing.id, data);
      else await api.departments.create(data);
      setModal({ open: false }); load();
    } catch (e: unknown) { setFormError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!confirm("Deactivate this department?")) return;
    await api.departments.delete(id).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground">Manage organizational departments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Department
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{items.length} departments</span>
      </div>

      {loading ? <TableSkeleton rows={5} cols={4} /> : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Name", "Description", "Tenant", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No departments found</td></tr>
              ) : items.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0"><Building className="w-4 h-4" /></div>
                      <span className="font-medium text-foreground">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{d.description || "—"}</td>
                  <td className="px-4 py-3">{d.tenantName ? <Badge variant="outline">{d.tenantName}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{d.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{modal.editing ? "Edit Department" : "New Department"}</h2>
              <button onClick={() => setModal({ open: false })} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Human Resources"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Tenant</label>
                <select value={form.tenantId} onChange={(e) => setForm(f => ({ ...f, tenantId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">No tenant</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {modal.editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                  Active
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => setModal({ open: false })} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {modal.editing ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
