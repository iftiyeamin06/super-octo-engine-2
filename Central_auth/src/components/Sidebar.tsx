import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShieldCheck, Building2, Monitor, ClipboardList, LogOut, KeyRound, Building, Briefcase, Lock, Boxes, AppWindow, BugPlay } from "lucide-react";
import { cn } from "../lib/utils";
import { getSession, clearSession } from "../lib/auth";
import { api, type ModuleAccessible } from "../lib/api";

const navGroups = [
  {
    label: "Main",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/users",     icon: Users,           label: "Users" },
      { to: "/roles",     icon: ShieldCheck,     label: "Roles & Permissions" },
      { to: "/permissions", icon: Lock,          label: "Permissions" },
      { to: "/Modules",   icon: Boxes,           label: "Modules" },
    ],
  },
  {
    label: "Organization",
    items: [
      { to: "/tenants",      icon: Building2,  label: "Tenants" },
      { to: "/departments",  icon: Building,   label: "Departments" },
      { to: "/designations", icon: Briefcase,  label: "Designations" },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { to: "/sessions",      icon: Monitor,       label: "Sessions" },
      { to: "/audit",         icon: ClipboardList, label: "Audit Logs" },
      { to: "/access-tester", icon: BugPlay,       label: "Access Tester" },
    ],
  },
];

const CACHE_KEY = "accessible_modules";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export default function Sidebar() {
  const navigate = useNavigate();
  const session = getSession();
  const [accessible, setAccessible] = useState<ModuleAccessible[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const cached = JSON.parse(raw);
      if (Date.now() - cached.fetchedAt > CACHE_TTL) return [];
      return cached.modules ?? [];
    } catch { return []; }
  });

  useEffect(() => {
    api.modules.accessible().then(mods => {
      setAccessible(mods);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ modules: mods, fetchedAt: Date.now() }));
    }).catch(() => {});
  }, []);

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="w-64 flex flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">CentralAuth</p>
          <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">{label}</p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label: itemLabel }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {accessible.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">Applications</p>
            <div className="space-y-0.5">
              {accessible.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => navigate(`/apps/${mod.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-left"
                >
                  <AppWindow className="w-4 h-4 flex-shrink-0" />
                  {mod.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-semibold flex-shrink-0">
            {session?.user.fullName?.charAt(0) ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{session?.user.fullName ?? "Admin"}</p>
            <p className="text-xs text-slate-500 truncate">{session?.user.email ?? ""}</p>
          </div>
          <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
