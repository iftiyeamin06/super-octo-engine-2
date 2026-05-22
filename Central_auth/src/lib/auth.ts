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
