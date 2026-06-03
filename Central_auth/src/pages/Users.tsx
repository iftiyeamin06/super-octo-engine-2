import { useEffect, useState, useCallback } from "react";
import { Search, Plus, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight, X, Loader2, Eye, EyeOff, Pencil } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { cn } from "../lib/utils";
import { api, type UserListItem, type TenantListItem, type RoleListItem, type DepartmentItem, type DesignationItem } from "../lib/api";

const emptyForm = {
  firstName: "", lastName: "", email: "", userName: "", password: "",
  phoneNumber: "", tenantId: "", departmentId: "", designationId: "",
  isActive: true,
  roleIds: [] as number[],
};

export default function Users() {
  const [items, setItems] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modal, setModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);

  const PAGE_SIZE = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page), pageSize: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    };
    api.users.list(params)
      .then((r) => { setItems(r.items); setTotal(r.totalCount); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([api.tenants.list(), api.roles.list(), api.departments.list(), api.designations.list()]).then(([t, r, d, dg]) => { setTenants(t); setRoles(r); setDepartments(d); setDesignations(dg); }).catch(() => {});
  }, []);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError(null);
    setShowPwd(false);
    setModal(true);
  }

  function openEdit(user: UserListItem) {
    const roleIds = roles.filter(r => user.roles.includes(r.name)).map(r => r.id);
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userName: user.userName,
      password: "",
      phoneNumber: user.phoneNumber ?? "",
      tenantId: user.tenantId ? String(user.tenantId) : "",
      departmentId: user.departmentId ? String(user.departmentId) : "",
      designationId: user.designationId ? String(user.designationId) : "",
      isActive: user.isActive,
      roleIds,
    });
    setFormError(null);
    setShowPwd(false);
    setModal(true);
  }

  async function save() {
    setSaving(true); setFormError(null);
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber || null,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          designationId: form.designationId ? Number(form.designationId) : null,
          isActive: form.isActive,
          roleIds: form.roleIds,
        });
      } else {
        await api.users.create({
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, userName: form.userName, password: form.password,
          phoneNumber: form.phoneNumber || null,
          tenantId: form.tenantId ? Number(form.tenantId) : null,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
          designationId: form.designationId ? Number(form.designationId) : null,
          roleIds: form.roleIds,
        });
      }
      setModal(false);
      setEditingUser(null);
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : editingUser ? "Failed to update user" : "Failed to create user");
    } finally { setSaving(false); }
  }

  async function toggleLock(u: UserListItem) {
    if (u.isLocked) await api.users.unlock(u.id).catch(() => {});
    else await api.users.lock(u.id).catch(() => {});
    load();
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user?")) return;
    await api.users.delete(id).catch(() => {});
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusBadge = (u: UserListItem) => {
    if (u.isLocked) return <Badge variant="danger">Locked</Badge>;
    if (u.isActive) return <Badge variant="success">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users…"
              className="pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-60" />
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-sm">
            {["all", "active", "inactive", "locked"].map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn("px-3 py-1 rounded-md capitalize transition-colors",
                  statusFilter === s ? "bg-card shadow text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{total} users</span>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={9} /> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["User", "Roles", "Tenant", "Department", "Designation", "2FA", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No users found</td></tr>
                ) : items.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {u.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span>
                          : u.roles.map(r => <Badge key={r}>{r}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{u.tenantName ? <Badge variant="outline">{u.tenantName}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.departmentName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.designationName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium", u.twoFactorEnabled ? "text-emerald-600" : "text-muted-foreground")}>
                        {u.twoFactorEnabled ? "✓ On" : "Off"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(u)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)}
                          title="Edit"
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleLock(u)}
                          title={u.isLocked ? "Unlock" : "Lock"}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          {u.isLocked ? <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> : <UserX className="w-3.5 h-3.5 text-orange-500" />}
                        </button>
                        <button onClick={() => deleteUser(u.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} users</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border rounded-xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">{editingUser ? "Edit User" : "Create User"}</h2>
              <button onClick={() => { setModal(false); setEditingUser(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {formError && <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{formError}</div>}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "First Name *", key: "firstName", placeholder: "John" },
                  { label: "Last Name *", key: "lastName", placeholder: "Doe" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                    <input value={(form as Record<string, unknown>)[key] as string}
                      onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                ))}
              </div>

              {!editingUser && [
                { label: "Email *", key: "email", type: "email", placeholder: "john@example.com" },
                { label: "Username *", key: "userName", type: "text", placeholder: "john.doe" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
                <input type="tel" value={form.phoneNumber}
                  onChange={(e) => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="+880 1700 000000"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Department *</label>
                  <select value={form.departmentId} onChange={(e) => setForm(f => ({ ...f, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Designation *</label>
                  <select value={form.designationId} onChange={(e) => setForm(f => ({ ...f, designationId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    <option value="">Select designation</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {!editingUser && <div>
                <label className="block text-xs font-medium text-foreground mb-1">Password *</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>}

              {editingUser && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border bg-background accent-primary" />
                  Is Active
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!editingUser && <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Tenant</label>
                  <select value={form.tenantId} onChange={(e) => setForm(f => ({ ...f, tenantId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">No tenant</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Roles</label>
                  <select multiple value={form.roleIds.map(String)}
                    onChange={(e) => setForm(f => ({ ...f, roleIds: Array.from(e.target.selectedOptions, o => Number(o.value)) }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 h-20">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground mt-0.5">Hold Ctrl to select multiple</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t">
              <button onClick={() => { setModal(false); setEditingUser(null); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={save}
                disabled={saving || !form.firstName || !form.lastName || !form.departmentId || !form.designationId || (!editingUser && (!form.email || !form.userName || !form.password))}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
