import { useEffect, useState } from "react";
import { Lock, Search } from "lucide-react";
import Badge from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { api, type Permission } from "../lib/api";

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([api.permissions.list(), api.permissions.groups()])
      .then(([perms, grps]) => { setPermissions(perms); setGroups(grps); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = permissions.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchGroup = groupFilter === "all" || p.groupName === groupFilter;
    return matchSearch && matchGroup;
  });

  const grouped = groups.map(g => ({
    group: g,
    perms: filtered.filter(p => p.groupName === g),
  })).filter(g => g.perms.length > 0);

  const ungrouped = filtered.filter(p => !p.groupName);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Permissions</h1>
        <p className="text-sm text-muted-foreground">System-defined permission codes assigned to roles</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions…"
            className="pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-56" />
        </div>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="all">All groups</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} permissions</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-12 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ group, perms }) => (
            <div key={group} className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                <span className="text-xs text-muted-foreground">{perms.length} permissions</span>
              </div>
              <div className="p-3 grid gap-2">
                {perms.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.isSystem && <Badge variant="warning">System</Badge>}
                      {p.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Ungrouped</h3>
              </div>
              <div className="p-3 grid gap-2">
                {ungrouped.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.code}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No permissions match your search</div>
          )}
        </div>
      )}
    </div>
  );
}
