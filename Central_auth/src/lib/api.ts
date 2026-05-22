const BASE = "http://localhost:5050/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("central_auth_session")
    ? JSON.parse(localStorage.getItem("central_auth_session")!).token
    : null;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("central_auth_session");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (data: { email: string; password: string }) =>
      req<{ accessToken: string; expiresAt: string; user: { id: number; fullName: string; email: string; tenantName?: string; roles: string[] } }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  },
  dashboard: {
    stats:      () => req<DashboardStats>("/dashboard/stats"),
    recentUsers:() => req<RecentUser[]>("/dashboard/recent-users"),
    recentAudit:() => req<AuditActivity[]>("/dashboard/recent-audit"),
  },
  users: {
    list: (params?: Record<string, string>) =>
      req<PagedResult<UserListItem>>("/users?" + new URLSearchParams(params)),
    create: (data: unknown)          => req("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    lock:   (id: number)             => req(`/users/${id}/lock`, { method: "PATCH" }),
    unlock: (id: number)             => req(`/users/${id}/unlock`, { method: "PATCH" }),
    delete: (id: number)             => req(`/users/${id}`, { method: "DELETE" }),
  },
  roles: {
    list:   (tenantId?: number)      => req<RoleListItem[]>(`/roles${tenantId ? `?tenantId=${tenantId}` : ""}`),
    detail: (id: number)             => req<RoleDetail>(`/roles/${id}`),
    create: (data: unknown)          => req("/roles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number)             => req(`/roles/${id}`, { method: "DELETE" }),
  },
  tenants: {
    list:   ()                       => req<TenantListItem[]>("/tenants"),
    create: (data: unknown)          => req("/tenants", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number)             => req(`/tenants/${id}`, { method: "DELETE" }),
  },
  permissions: {
    list: (group?: string)           => req<Permission[]>(`/permissions${group ? `?group=${group}` : ""}`),
    groups: ()                       => req<string[]>("/permissions/groups"),
  },
  sessions: {
    list: (params?: Record<string, string>) =>
      req<{ items: Session[]; total: number }>("/sessions?" + new URLSearchParams(params)),
    revoke:    (id: number, reason?: string) => req(`/sessions/${id}/revoke?reason=${reason ?? ""}`, { method: "DELETE" }),
    revokeAll: (userId: number)      => req(`/sessions/user/${userId}/revoke-all`, { method: "DELETE" }),
  },
  audit: {
    list: (params?: Record<string, string>) =>
      req<{ items: AuditEntry[]; total: number }>("/audit?" + new URLSearchParams(params)),
  },
  services: {
    list: () => req<ServiceItem[]>("/services"),
    create: (data: unknown) => req("/services", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    addApiKey: (id: number, data: unknown) => req<{ id: number; description: string; expiresAt?: string }>(`/services/${id}/api-keys`, { method: "POST", body: JSON.stringify(data) }),
  },
  departments: {
    list: (tenantId?: number) => req<DepartmentItem[]>(`/departments${tenantId ? `?tenantId=${tenantId}` : ""}`),
    create: (data: unknown) => req("/departments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => req(`/departments/${id}`, { method: "DELETE" }),
  },
  designations: {
    list: (tenantId?: number) => req<DesignationItem[]>(`/designations${tenantId ? `?tenantId=${tenantId}` : ""}`),
    create: (data: unknown) => req("/designations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => req(`/designations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => req(`/designations/${id}`, { method: "DELETE" }),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers: number; activeUsers: number; lockedUsers: number;
  activeSessions: number; totalRoles: number; totalTenants: number;
  totalServices: number; totalApiKeys: number; pendingOtps: number;
  totalModules: number; totalPermissions: number;
}
export interface RecentUser { id: number; fullName: string; email: string; role?: string; tenant?: string; isActive: boolean; isLocked: boolean; createdAt: string; }
export interface AuditActivity { id: number; actionType: string; entityName: string; userEmail?: string; ipAddress?: string; createdAt: string; }
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface UserListItem { id: number; firstName: string; lastName: string; email: string; userName: string; isActive: boolean; isLocked: boolean; twoFactorEnabled: boolean; failedLoginAttempts: number; lastLoginAt?: string; createdAt: string; tenantId?: number; tenantName?: string; departmentId?: number; departmentName?: string; designationId?: number; designationName?: string; roles: string[]; }
export interface RoleListItem { id: number; name: string; description?: string; isActive: boolean; isSystem: boolean; tenantId?: number; tenantName?: string; userCount: number; permissionCount: number; createdAt: string; }
export interface RoleDetail { id: number; name: string; description?: string; isActive: boolean; isSystem: boolean; permissions: Permission[]; modules: Module[]; }
export interface Permission { id: number; code: string; name: string; description?: string; groupName?: string; isSystem: boolean; isActive: boolean; }
export interface Module { id: number; name: string; code: string; route: string; icon?: string; sortOrder: number; parentId?: number; isActive: boolean; }
export interface TenantListItem { id: number; name: string; code: string; description?: string; contactEmail?: string; subscriptionPlan?: string; subscriptionExpiresAt?: string; isActive: boolean; createdAt: string; userCount: number; }
export interface Session { id: number; sessionId: string; appUserId: number; userEmail: string; deviceId?: string; ipAddress?: string; loginAtUtc: string; expiresAtUtc: string; isActive: boolean; }
export interface AuditEntry { id: number; actionType: string; entityName: string; entityKey: string; userEmail?: string; ipAddress?: string; createdAt: string; }
export interface ServiceItem { id: number; name: string; code: string; description?: string; baseUrl?: string; isActive: boolean; createdAt: string; apiKeyCount: number; }
export interface DepartmentItem { id: number; name: string; description?: string; isActive: boolean; tenantId?: number; tenantName?: string; createdAt: string; }
export interface DesignationItem { id: number; name: string; description?: string; isActive: boolean; tenantId?: number; tenantName?: string; createdAt: string; }
