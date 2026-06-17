import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import Badge from "../components/Badge";
import { TableSkeleton } from "../components/Skeleton";
import { cn, formatDateTime } from "../lib/utils";
import { api, type UserListItem } from "../lib/api";

export default function UserProfileList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {
      page: String(page), pageSize: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    };
    api.users.list(params)
      .then((r) => { setItems(r.items); setTotal(r.totalCount); })
      .catch((e) => { setError(e instanceof Error ? e.message : "Failed to load users"); setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusBadge = (u: UserListItem) => {
    if (u.isLocked) return <Badge variant="danger">Locked</Badge>;
    if (u.isActive) return <Badge variant="success">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">User Profile</h1>
          <p className="text-sm text-muted-foreground">View detailed user profiles, roles, permissions, and activity</p>
        </div>
      </div>

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
        <span className="text-sm text-muted-foreground">{total} users</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? <TableSkeleton rows={8} cols={7} /> : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["User", "Roles", "Department", "Status", "Last Login", "Joined", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No users found</td></tr>
                ) : items.map((u) => (
                  <tr key={u.id}
                    onClick={() => navigate(`/user-profiles/${u.id}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {u.profilePhotoStorageKey ? (
                            <img src={`/uploads/${u.profilePhotoStorageKey}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : u.firstName.charAt(0)}
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
                          : u.roles.slice(0, 3).map(r => <Badge key={r}>{r}</Badge>)}
                        {u.roles.length > 3 && <Badge>+{u.roles.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.departmentName ?? "—"}</td>
                    <td className="px-4 py-3">{statusBadge(u)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-primary font-medium">View →</span>
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
    </div>
  );
}
