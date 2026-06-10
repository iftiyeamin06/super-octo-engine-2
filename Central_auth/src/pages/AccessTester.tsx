import { useEffect, useState } from "react";
import { Loader2, Play, ShieldCheck } from "lucide-react";
import { api, type ModuleRouteItem } from "../lib/api";
import { getSession } from "../lib/auth";

interface RouteWithModule extends ModuleRouteItem {
  moduleName: string;
}

interface TestResult {
  status: number | null;
  loading: boolean;
}

export default function AccessTester() {
  const [routes, setRoutes] = useState<RouteWithModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});

  useEffect(() => {
    async function load() {
      try {
        const mods = await api.modules.list();
        const allRoutes: RouteWithModule[] = [];
        for (const m of mods) {
          const rs = await api.modules.routes.list(m.id);
          for (const r of rs) {
            allRoutes.push({ ...r, moduleName: m.name });
          }
        }
        setRoutes(allRoutes);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function testRoute(route: RouteWithModule) {
    setTestResults(p => ({ ...p, [route.id]: { status: null, loading: true } }));
    try {
      const session = getSession();
      if (!session?.token) throw new Error("No token");
      const res = await fetch(route.routePattern, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setTestResults(p => ({ ...p, [route.id]: { status: res.status, loading: false } }));
    } catch {
      setTestResults(p => ({ ...p, [route.id]: { status: 0, loading: false } }));
    }
  }

  const accessible = Object.values(testResults).filter(r => r.status === 200).length;
  const tested = Object.values(testResults).filter(r => r.status !== null && !r.loading).length;

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'text-emerald-600';
      case 'POST': return 'text-blue-600';
      case 'PUT': return 'text-amber-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const allTested = tested === routes.length && routes.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Access Tester</h1>
        <p className="text-sm text-muted-foreground">Test all registered API routes against your current permissions</p>
      </div>

      {allTested && (
        <div className={`rounded-xl border p-4 ${tested === accessible ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <p className={`text-sm font-semibold ${tested === accessible ? 'text-emerald-600' : 'text-red-500'}`}>
            {accessible} of {routes.length} routes accessible with your current permissions
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : routes.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">No routes registered yet. Add routes in the Modules page.</div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Module</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Permission</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Result</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => {
                const tr = testResults[route.id];
                return (
                  <tr key={route.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{route.moduleName}</td>
                    <td className="px-4 py-3"><span className={`font-mono font-semibold text-xs ${methodColor(route.httpMethod)}`}>{route.httpMethod}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{route.routePattern}</td>
                    <td className="px-4 py-3"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{route.requiredPermissionCode}</code></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {tr?.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline-block text-muted-foreground" />
                      ) : tr?.status ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${tr.status === 200 ? 'text-emerald-600' : 'text-red-500'}`}
                          title={tr.status === 403 ? `Missing: ${route.requiredPermissionCode}` : undefined}
                        >
                          {tr.status === 200 ? '✅' : '❌'} {tr.status}
                        </span>
                      ) : (
                        <button onClick={() => testRoute(route)} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
                          <Play className="w-3 h-3" /> Test
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!allTested && tested > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {accessible} of {routes.length} routes accessible ({tested} tested)
        </p>
      )}

      {routes.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => routes.forEach(r => testRoute(r))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ShieldCheck className="w-4 h-4" /> Test All Routes
          </button>
        </div>
      )}
    </div>
  );
}