import { useEffect, useState, useCallback, useRef } from "react";
import { Monitor, ShieldOff, LogOut, RefreshCw, Users, Activity, Globe } from "lucide-react";
import Badge from "../components/Badge";
import StatCard from "../components/StatCard";
import { api, type Session } from "../lib/api";

export default function Sessions() {
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [stats, setStats] = useState({ activeSessions: 0, totalSessions: 0, usersOnline: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const loadGen = useRef(0);
  const PAGE_SIZE = 20;

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api.sessions.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const gen = ++loadGen.current;
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(activeOnly ? { activeOnly: "true" } : {}),
    };
    api.sessions.list(params)
      .then((r) => { if (gen === loadGen.current) { setItems(r.items); setTotal(r.total); } })
      .catch(() => {})
      .finally(() => { if (gen === loadGen.current) setLoading(false); });
  }, [page, search, activeOnly]);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  async function revoke(id: number) {
    if (!confirm("Revoke this session?")) return;
    await api.sessions.revoke(id, "Admin revoked").catch(() => {});
    load();
    loadStats();
  }

  async function revokeAll(userId: number) {
    if (!confirm("Revoke ALL sessions for this user?")) return;
    await api.sessions.revokeAll(userId).catch(() => {});
    load();
    loadStats();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Session Tracking</h1>
          <p className="text-sm text-muted-foreground">Active and historical sessions</p>
        </div>
        <button onClick={() => { load(); loadStats(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Sessions" value={stats.activeSessions} icon={Activity} color="green" />
        <StatCard label="Total Sessions" value={stats.totalSessions} icon={Globe} color="blue" />
        <StatCard label="Users Online" value={stats.usersOnline} icon={Users} color="purple" />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by email, IP, or device…"
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
                {["Session Id", "Device", "Status", "IP Address", "User Agent", "Login At", "Last Seen", "Expires"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No sessions found</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{s.sessionId.slice(0, 12)}…</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground font-medium text-xs">{s.deviceId ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive
                      ? <Badge variant="success">Active</Badge>
                      : <Badge variant="outline">Closed</Badge>}
                  </td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.ipAddress ?? "—"}</code></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={s.userAgent}>
                    {s.userAgent || "No agent recorded"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.loginAtUtc).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.lastSeenAtUtc).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.expiresAtUtc).toLocaleString()}</td>
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
