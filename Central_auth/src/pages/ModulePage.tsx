import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppWindow, ArrowLeft, Loader2, ShieldCheck, Play } from "lucide-react";
import { api, type ModuleDetail, type ModuleRouteItem } from "../lib/api";
import { getSession } from "../lib/auth";

interface TestResult {
  status: number | null;
  loading: boolean;
}

export default function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [routes, setRoutes] = useState<ModuleRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});

  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    const id = Number(moduleId);
    Promise.all([
      api.modules.detail(id),
      api.modules.routes.list(id)
    ])
      .then(([mod, rs]) => { setModule(mod); setRoutes(rs); })
      .catch(() => setError("Module not found"))
      .finally(() => setLoading(false));
  }, [moduleId]);

  async function testRoute(route: ModuleRouteItem) {
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

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'text-emerald-600';
      case 'POST': return 'text-blue-600';
      case 'PUT': return 'text-amber-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-sm text-muted-foreground">{error ?? "Module not found"}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <AppWindow className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{module.name}</h1>
          <p className="text-sm text-muted-foreground">
            {module.code} &middot; <code className="bg-muted px-1 py-0.5 rounded text-xs">{module.route}</code> &middot; {routes.length} route{routes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {routes.length === 0 ? (
        <div className="border rounded-xl bg-card px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No API routes registered for this module.</p>
          <p className="text-xs text-muted-foreground mt-1">Add routes in the Modules page first.</p>
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Access Tests</p>
              <p className="text-xs text-muted-foreground">Check your permissions against each registered API route</p>
            </div>
            <button
              onClick={() => routes.forEach(r => testRoute(r))}
              disabled={routes.every(r => testResults[r.id]?.loading)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" /> Test All
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Required Permission</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Result</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => {
                const tr = testResults[route.id];
                return (
                  <tr key={route.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
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

      <div className="border rounded-xl bg-card px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Module Info</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Name</span><p className="text-foreground font-medium">{module.name}</p></div>
          <div><span className="text-muted-foreground">Code</span><p className="text-foreground font-medium">{module.code}</p></div>
          <div><span className="text-muted-foreground">Route</span><p className="text-foreground font-mono text-xs">{module.route}</p></div>
          <div><span className="text-muted-foreground">Status</span><p className="text-foreground font-medium">{module.isActive ? "Active" : "Inactive"}</p></div>
        </div>
      </div>
    </div>
  );
}