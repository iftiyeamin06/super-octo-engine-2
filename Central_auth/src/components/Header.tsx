import { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun, Search, ShieldCheck, LogOut, Camera } from "lucide-react";
import { getSession, getPermissions, clearSession, saveSession } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { api } from "../lib/api";

const titles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your auth system" },
  "/users": { title: "User Management", description: "Manage users, roles and access" },
  "/roles": { title: "Roles & Permissions", description: "Configure roles and permission sets" },
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const page = titles[pathname] ?? { title: "CentralAuth", description: "" };
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const permissions = getPermissions();
  const session = getSession();
  const { theme, toggleTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowPerms(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  function logout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user.id) return;
    setUploading(true);
    try {
      const result = await api.users.uploadPhoto(session.user.id, file);
      saveSession({ ...session, user: { ...session.user, profilePhotoStorageKey: result.profilePhotoStorageKey } });
    } catch { /* ignore */ }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  const photoUrl = session?.user.profilePhotoStorageKey
    ? `/uploads/${session.user.profilePhotoStorageKey}`
    : null;

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
          onClick={() => toggleTheme()}
          className="relative p-2 rounded-lg hover:bg-muted transition-colors group"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Profile Card */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => { setShowDropdown(!showDropdown); setShowPerms(false); }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {session?.user.fullName?.charAt(0) ?? "A"}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground leading-none">{session?.user.fullName ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{session?.user.roles?.[0] ?? ""}</p>
            </div>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowDropdown(false); setShowPerms(false); }} />
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border rounded-xl shadow-xl overflow-hidden">
                {/* User Info */}
                <div className="px-4 py-3 border-b flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 group"
                    title="Change photo"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold text-primary">
                        {session?.user.fullName?.charAt(0) ?? "A"}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{session?.user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user.email}</p>
                    {session?.user.tenantName && (
                      <p className="text-xs text-muted-foreground truncate">{session?.user.tenantName}</p>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                <div className="px-2 py-1.5">
                  <button
                    onClick={() => setShowPerms(!showPerms)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-left">My Permissions</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{permissions.length}</span>
                  </button>
                </div>

                {showPerms && (
                  <div className="px-3 pb-2 max-h-48 overflow-y-auto space-y-1">
                    {permissions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No permissions assigned</p>
                    ) : (
                      permissions.map(p => (
                        <div key={p} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50">
                          <code className="text-xs font-mono text-foreground">{p}</code>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Divider + Logout */}
                <div className="border-t px-2 py-1.5">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
      </div>
    </header>
  );
}
