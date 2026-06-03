import { useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Pencil, Plus, X } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { api, type ModuleListItem, type ModuleSavePayload } from "../lib/api";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    parentId: "",
    sortOrder: "0",
    icon: "",
    route: "",
    isActive: true,
  });

  const parentOptions = useMemo(
    () => items.filter((item) => item.id !== editingId),
    [editingId, items],
  );

  const load = () => {
    setLoading(true);
    api.modules.list().then(setItems).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormError(null);
    setForm({
      name: "",
      code: "",
      parentId: "",
      sortOrder: "0",
      icon: "",
      route: "",
      isActive: true,
    });
    setModalOpen(true);
  }

  async function openEdit(id: number) {
    setEditingId(id);
    setModalOpen(true);
    setFormError(null);
    setDetailLoading(true);
    try {
      const module = await api.modules.detail(id);
      setForm({
        name: module.name,
        code: module.code,
        parentId: module.parentId ? String(module.parentId) : "",
        sortOrder: String(module.sortOrder ?? 0),
        icon: module.icon ?? "",
        route: module.route,
        isActive: module.isActive,
      });
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to load module");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setFormError(null);
    setDetailLoading(false);
    setSaving(false);
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    const payload: ModuleSavePayload = {
      name: form.name,
      code: form.code,
      parentId: form.parentId ? Number(form.parentId) : null,
      sortOrder: Number(form.sortOrder || 0),
      icon: form.icon || null,
      route: form.route,
      isActive: form.isActive,
    };

    try {
      if (editingId) await api.modules.update(editingId, payload);
      else await api.modules.create(payload);
      closeModal();
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Modules</h1>
          <p className="text-sm text-muted-foreground">Browse and maintain module records from the auth_modules table</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Create Module
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Name", "Code", "Route", "IsActive", "CreatedAt", "UpdatedAt", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No modules found
                    </td>
                  </tr>
                ) : items.map((module) => (
                  <tr key={module.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{module.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{module.code}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{module.route}</td>
                    <td className="px-4 py-3">
                      {module.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(module.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(module.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(module.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{editingId ? "Edit Module" : "Create Module"}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
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
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Parent Module</label>
                  <select
                    value={form.parentId}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">No parent</option>
                    {parentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Sort Order *</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border bg-background accent-primary"
                />
                Is Active
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || detailLoading || !form.name || !form.code || !form.route}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? "Save Changes" : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
