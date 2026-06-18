import { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert, RefreshCw, Search, ChevronDown } from "lucide-react";
import { api, type AuditEntry } from "../lib/api";
import { formatDateTime } from "../lib/utils";

const SECURITY_ACTIONS = [
  "Login",
  "Login Failed",
  "Logout",
  "ForgotPassword",
  "PasswordReset",
  "PasswordResetFailed",
  "EmailVerified",
  "EmailVerificationRequested",
  "EmailVerificationFailed",
  "Lock",
  "Unlock",
  "Revoke",
];

const ACTION_COLORS: Record<string, string> = {
  "Login": "bg-emerald-500/10 text-emerald-600",
  "Login Failed": "bg-red-500/10 text-red-600",
  "Logout": "bg-slate-500/10 text-slate-600",
  "ForgotPassword": "bg-amber-500/10 text-amber-600",
  "PasswordReset": "bg-amber-500/10 text-amber-600",
  "PasswordResetFailed": "bg-red-500/10 text-red-600",
  "EmailVerified": "bg-emerald-500/10 text-emerald-600",
  "EmailVerificationRequested": "bg-blue-500/10 text-blue-600",
  "EmailVerificationFailed": "bg-red-500/10 text-red-600",
  "Lock": "bg-red-500/10 text-red-600",
  "Unlock": "bg-green-500/10 text-green-600",
  "Revoke": "bg-purple-500/10 text-purple-600",
};

function actionColor(type: string) {
  const entry = Object.entries(ACTION_COLORS).find(([k]) => type.includes(k));
  return entry?.[1] ?? "bg-muted text-muted-foreground";
}

function parseDetails(newValues?: string): string {
  if (!newValues) return "";
  try {
    const obj = JSON.parse(newValues);
    const parts: string[] = [];
    if (obj.method) parts.push(obj.method === "magic_link" ? "Magic Link" : obj.method === "otp" ? "OTP" : obj.method);
    if (obj.reason) parts.push(obj.reason.replace(/_/g, " "));
    return parts.join(" - ");
  } catch {
    return "";
  }
}

function actionIcon(type: string): string {
  if (type.includes("Failed") || type === "Lock") return "✕";
  if (type === "Login") return "→";
  if (type === "Logout") return "←";
  if (type === "Unlock") return "🔓";
  if (type === "Revoke") return "⊘";
  if (type.includes("Reset")) return "↻";
  if (type.includes("Verification") && type.includes("Requested")) return "✉";
  if (type.includes("Verified")) return "✓";
  return "•";
}

export default function SecurityLog() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 30;
  const loadGen = useRef(0);

  const load = useCallback(() => {
    const gen = ++loadGen.current;
    setLoading(true); setError(null);
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(debouncedAction ? { action: debouncedAction } : {}),
    };
    api.audit.list(params)
      .then((r) => {
        if (gen !== loadGen.current) return;
        const securityItems = r.items.filter(item =>
          SECURITY_ACTIONS.some(sa => item.actionType.includes(sa))
        );
        setItems(securityItems);
        setTotal(r.total);
      })
      .catch((e) => { if (gen === loadGen.current) { setItems([]); setTotal(0); setError(e instanceof Error ? e.message : "Failed to load security log"); } })
      .finally(() => { if (gen === loadGen.current) setLoading(false); });
  }, [page, debouncedSearch, debouncedAction]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setDebouncedAction(actionFilter); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search, actionFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Security Log
          </h1>
          <p className="text-sm text-muted-foreground">Authentication and security events</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user or IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="appearance-none px-3 py-2 pr-8 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Actions</option>
              {SECURITY_ACTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showFilters ? "Hide" : "Show"} filters
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{total} events</span>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <ShieldAlert className="w-8 h-8 mb-2 opacity-30" />
          <p>No security events found</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wier">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">{actionIcon(a.actionType)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${actionColor(a.actionType)}`}>
                      {a.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{a.userEmail ?? "System"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {parseDetails(a.newValues) || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-muted-foreground">{a.ipAddress ?? "—"}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</td>
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
