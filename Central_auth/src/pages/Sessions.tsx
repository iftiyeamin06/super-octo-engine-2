import { useEffect, useState, useCallback } from "react";
import { Monitor, ShieldOff, LogOut, RefreshCw } from "lucide-react";
import Badge from "../components/Badge";
import { api, type Session } from "../lib/api";

export default function Sessions() {
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(activeOnly ? { activeOnly: "true" } : {}),
    };
    api.sessions.list(params)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, activeOnly]);

  useEffect(() => { load(); }, [load]);

  async function revoke(id: number) {
    if (!confirm("Revoke this session?")) return;
    await api.sessions.revoke(id, "Admin revoked").catch(() => {});
    load();
  }

  async function revokeAll(userId: number) {
    if (!confirm("Revoke ALL sessions for this user?")) return;
    await api.sessions.revokeAll(userId).catch(() => {});
    load();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage active login sessions</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by email or IP…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-sm px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }} className="rounded" />
          Active only
        </label>
        <span className="text-xs text-muted-foreground">{total} sessions</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["User", "IP Address", "Device", "Login Time", "Expires", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No sessions found</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground font-medium">{s.userEmail}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.ipAddress ?? "—"}</code></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.deviceId ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.loginAtUtc).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.expiresAtUtc).toLocaleString()}</td>
                  <td className="px-4 py-3">{s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Expired</Badge>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {s.isActive && (
                        <>
                          <button onClick={() => revoke(s.id)} title="Revoke session" className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                            <ShieldOff className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => revokeAll(s.appUserId)} title="Revoke all user sessions" className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded border hover:bg-muted disabled:opacity-40 transition-colors">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded border hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
