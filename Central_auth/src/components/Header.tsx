import { useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";

const titles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your auth system" },
  "/users": { title: "User Management", description: "Manage users, roles and access" },
  "/roles": { title: "Roles & Permissions", description: "Configure roles and permission sets" },
};

export default function Header() {
  const { pathname } = useLocation();
  const page = titles[pathname] ?? { title: "CentralAuth", description: "" };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
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
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
}
