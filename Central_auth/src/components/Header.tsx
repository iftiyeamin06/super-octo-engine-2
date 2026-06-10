import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { getSession, getPermissions } from "../lib/auth";

const titles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your auth system" },
  "/users": { title: "User Management", description: "Manage users, roles and access" },
  "/roles": { title: "Roles & Permissions", description: "Configure roles and permission sets" },
};

export default function Header() {
  const { pathname } = useLocation();
  const page = titles[pathname] ?? { title: "CentralAuth", description: "" };
  const [showPerms, setShowPerms] = useState(false);
  const permissions = getPermissions();
  const session = getSession();

  return (
    <header className="relative flex items-center justify-between px-6 py-4 border-b bg-card">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{page.title}</h1>
        <p className="text-sm text-muted-foreground">{page.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-56"
          />
        </div>
        <button
          onClick={() => setShowPerms(!showPerms)}
          className="relative p-2 rounded-lg hover:bg-muted transition-colors group"
          title="My Permissions"
        >
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
            {permissions.length}
          </span>
        </button>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>

      {showPerms && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPerms(false)} />
          <div className="absolute right-4 top-full mt-2 z-50 w-80 bg-card border rounded-xl shadow-xl max-h-96 overflow-y-auto">
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-semibold text-foreground">My Permissions</p>
              <p className="text-xs text-muted-foreground">{session?.user.fullName} &middot; {session?.user.roles?.join(", ")}</p>
            </div>
            <div className="p-3 space-y-1">
              {permissions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No permissions assigned</p>
              ) : (
                permissions.map(p => (
                  <div key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
                    <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />
                    <code className="text-xs font-mono text-foreground">{p}</code>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t text-[10px] text-muted-foreground text-center">
              Decoded from JWT &middot; {permissions.length} claim{permissions.length !== 1 ? "s" : ""}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
