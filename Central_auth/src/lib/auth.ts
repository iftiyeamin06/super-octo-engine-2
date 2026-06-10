export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  tenantName?: string;
  roles: string[];
}

export interface AuthState {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

const KEY = "central_auth_session";

export function getSession(): AuthState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s: AuthState = JSON.parse(raw);
    if (new Date(s.expiresAt) < new Date()) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

export function saveSession(s: AuthState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

const MODULE_CACHE_KEY = "accessible_modules";

export function clearAccessibleModulesCache() {
  localStorage.removeItem(MODULE_CACHE_KEY);
}

export function getPermissions(): string[] {
  const session = getSession();
  if (!session?.token) return [];
  try {
    const payload = session.token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const decoded = JSON.parse(atob(padded));
    const raw = decoded.permission;
    return Array.isArray(raw) ? raw : (raw ? [raw] : []);
  } catch { return []; }
}
