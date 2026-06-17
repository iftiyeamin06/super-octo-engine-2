import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShieldCheck, Building2, Monitor, ClipboardList, KeyRound, Building, Briefcase, Boxes, AppWindow, BugPlay, Shield } from "lucide-react";
import { cn } from "../lib/utils";
import { api, type ModuleAccessible } from "../lib/api";

const navGroups = [
  {
    label: "Main",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/users",     icon: Users,           label: "Users" },
      { to: "/roles",     icon: ShieldCheck,     label: "Roles & Permissions" },
      { to: "/Modules",   icon: Boxes,           label: "Modules" },
      { to: "/user-access", icon: Shield,        label: "User Access" },
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
    </aside>
  );
}
