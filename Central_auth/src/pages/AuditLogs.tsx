import { useEffect, useState, useCallback } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { api, type AuditEntry } from "../lib/api";

const ACTION_COLORS: Record<string, string> = {
  Login: "bg-emerald-500/10 text-emerald-600",
  Logout: "bg-slate-500/10 text-slate-600",
  Create: "bg-blue-500/10 text-blue-600",
  Update: "bg-orange-500/10 text-orange-600",
  Delete: "bg-red-500/10 text-red-600",
  Failed: "bg-red-500/10 text-red-600",
  Lock: "bg-red-500/10 text-red-600",
  Unlock: "bg-green-500/10 text-green-600",
  Revoke: "bg-purple-500/10 text-purple-600",
};

function actionColor(type: string) {
  const entry = Object.entries(ACTION_COLORS).find(([k]) => type.includes(k));
  return entry?.[1] ?? "bg-muted text-muted-foreground";
}

export default function AuditLogs() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const PAGE_SIZE = 25;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
    };
    api.audit.list(params)
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, entity, action]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Full history of system actions and events</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search user or IP…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-48 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          placeholder="Entity (e.g. AppUser)…"
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="w-44 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          placeholder="Action (e.g. Login)…"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="w-40 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground ml-auto">{total} records</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Action", "Entity", "Key", "User", "IP Address", "Time"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No audit records found
                </td></tr>
              ) : items.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${actionColor(a.actionType)}`}>{a.actionType}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{a.entityName}</td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.entityKey}</code></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.userEmail ?? "System"}</td>
                  <td className="px-4 py-3"><code className="text-xs text-muted-foreground">{a.ipAddress ?? "—"}</code></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</td>
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
