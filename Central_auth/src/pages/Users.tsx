import { useEffect, useState, useCallback } from "react";
import { Search, Plus, UserCheck, UserX, Trash2, ChevronLeft, ChevronRight, X, Pencil } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import UserForm from "../components/UserForm";
import { type UserFormValues } from "../components/userFormModel";
import { cn } from "../lib/utils";
import { api, type UserListItem, type TenantListItem, type RoleListItem, type DepartmentItem, type DesignationItem } from "../lib/api";

export default function Users() {
  const [items, setItems] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modal, setModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
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
    setFormError(null);
    setModal(true);
  }

  function openEdit(user: UserListItem) {
    setEditingUser(user);
    setFormError(null);
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditingUser(null);
  }

  async function save(values: UserFormValues) {
    setSaving(true); setFormError(null);
    try {
      if (editingUser) {
        const tenantIds: number[] | null = values.tenantId ? [Number(values.tenantId)] : null;
        const roleIds:   number[]         = values.roleIds.map((id) => Number(id));
        const payload: Parameters<typeof api.users.update>[1] = {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          userName: values.userName,
          phoneNumber: values.phoneNumber || null,
          tenantIds,
          departmentId: values.departmentId ? Number(values.departmentId) : null,
          designationId: values.designationId ? Number(values.designationId) : null,
          isActive: values.isActive,
          roleIds,
        };
        if (values.newPassword) payload.newPassword = values.newPassword;
        await api.users.update(editingUser.id, payload);
      } else {
        const tenantIds: number[] = values.tenantId ? [Number(values.tenantId)] : [];
        const roleIds:   number[] = values.roleIds.map((id) => Number(id));
        await api.users.create({
          firstName: values.firstName, lastName: values.lastName,
          email: values.email, userName: values.userName, password: values.password,
          phoneNumber: values.phoneNumber || null,
          tenantIds,
          departmentId: values.departmentId ? Number(values.departmentId) : null,
          designationId: values.designationId ? Number(values.designationId) : null,
          roleIds,
        });
      }
      closeModal();
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
                  {["User", "Employee ID", "Roles", "Tenant", "Department", "Designation", "2FA", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No users found</td></tr>
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
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap font-mono">
                      {u.employeeId ?? <span className="font-sans">—</span>}
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
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
              <UserForm
                key={editingUser ? `edit-${editingUser.id}` : "create"}
                initialData={editingUser}
                tenants={tenants}
                roles={roles}
                departments={departments}
                designations={designations}
                saving={saving}
                formError={formError}
                onSubmit={save}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
