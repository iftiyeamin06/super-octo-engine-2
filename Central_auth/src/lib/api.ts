const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

function getSessionToken(): string | null {
  try {
    const raw = localStorage.getItem("central_auth_session");
    if (!raw) return null;
    return JSON.parse(raw)?.token ?? null;
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  localStorage.removeItem("central_auth_session");
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getSessionToken();
  const { headers: extraHeaders, ...rest } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders as Record<string, string> | undefined),
    },
    ...rest,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
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
    create: (data: UserCreatePayload) => req("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: UserUpdatePayload) => req(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
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
    create: (data: TenantPayload)    => req("/tenants", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: TenantPayload) => req(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number)             => req(`/tenants/${id}`, { method: "DELETE" }),
  },
  permissions: {
    list: (group?: string)           => req<Permission[]>(`/permissions${group ? `?group=${group}` : ""}`),
    groups: ()                       => req<string[]>("/permissions/groups"),
    create: (data: CreatePermissionPayload) => req<{id: number}>("/permissions", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: number)             => req<void>(`/permissions/${id}`, { method: "DELETE" }),
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
  modules: {
    list: () => req<ModuleListItem[]>("/modules"),
    detail: (id: number) => req<ModuleDetail>(`/modules/${id}`),
    create: (data: ModuleSavePayload) => req<void>("/modules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: ModuleSavePayload) => req<void>(`/modules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => req<void>(`/modules/${id}`, { method: "DELETE" }),
    accessible: () => req<ModuleAccessible[]>("/modules/accessible"),
    permissions: (id: number) => req<number[]>(`/modules/${id}/permissions`),
    updatePermissions: (id: number, permissionIds: number[]) => req<void>(`/modules/${id}/permissions`, { method: "PUT", body: JSON.stringify({ permissionIds }) }),
    routes: {
      list: (moduleId: number) => req<ModuleRouteItem[]>(`/modules/${moduleId}/routes`),
      create: (moduleId: number, data: ModuleRouteCreatePayload) => req<{ id: number }>(`/modules/${moduleId}/routes`, { method: "POST", body: JSON.stringify(data) }),
      update: (moduleId: number, routeId: number, data: ModuleRouteUpdatePayload) => req<void>(`/modules/${moduleId}/routes/${routeId}`, { method: "PUT", body: JSON.stringify(data) }),
      remove: (moduleId: number, routeId: number) => req<void>(`/modules/${moduleId}/routes/${routeId}`, { method: "DELETE" }),
    },
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
  totalModules: number; totalPermissions: number;
}
export interface RecentUser { id: number; fullName: string; email: string; role?: string; tenant?: string; isActive: boolean; isLocked: boolean; createdAt: string; }
export interface AuditActivity { id: number; actionType: string; entityName: string; userEmail?: string; ipAddress?: string; createdAt: string; }
export interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }
export interface UserListItem { id: number; firstName: string; lastName: string; email: string; userName: string; employeeId?: string | null; phoneNumber?: string | null; isActive: boolean; isLocked: boolean; twoFactorEnabled: boolean; failedLoginAttempts: number; lastLoginAt?: string; createdAt: string; tenantId?: number; tenantName?: string; departmentId?: number; departmentName?: string; designationId?: number; designationName?: string; roles: string[]; }
export interface UserUpdatePayload { firstName: string; lastName: string; email?: string; userName?: string; phoneNumber?: string | null; tenantIds?: number[] | null; departmentId?: number | null; designationId?: number | null; isActive: boolean; roleIds: number[]; newPassword?: string; }
export interface UserCreatePayload { firstName: string; lastName: string; email: string; userName: string; password: string; phoneNumber?: string | null; tenantIds: number[]; departmentId?: number | null; designationId?: number | null; roleIds: number[]; }
export interface RoleListItem { id: number; name: string; description?: string; isActive: boolean; isSystem: boolean; tenantId?: number; tenantName?: string; userCount: number; permissionCount: number; createdAt: string; }
export interface RoleDetail { id: number; name: string; description?: string; isActive: boolean; isSystem: boolean; permissions: Permission[]; modules: Module[]; }
export interface Permission { id: number; code: string; name: string; description?: string; groupName?: string; isSystem: boolean; isActive: boolean; }
export interface CreatePermissionPayload { code: string; name: string; description?: string | null; groupName?: string | null; }
export interface Module { id: number; name: string; code: string; route: string; icon?: string; sortOrder: number; parentId?: number; isActive: boolean; }
export interface TenantListItem { id: number; name: string; code: string; description?: string; contactEmail?: string; logoUrl?: string; subscriptionPlan?: string; subscriptionExpiresAt?: string; isActive: boolean; createdAt: string; userCount: number; }
export interface TenantPayload { name: string; code: string; description?: string; contactEmail?: string; logoUrl?: string; subscriptionPlan?: string; subscriptionExpiresAt?: string | null; isActive: boolean; }
export interface Session { id: number; sessionId: string; appUserId: number; userEmail: string; deviceId?: string; ipAddress?: string; loginAtUtc: string; expiresAtUtc: string; isActive: boolean; }
export interface AuditEntry { id: number; actionType: string; entityName: string; entityKey: string; userEmail?: string; ipAddress?: string; createdAt: string; }
export interface ModuleListItem { id: number; name: string; code: string; route: string; parentId?: number | null; isActive: boolean; createdAt: string; updatedAt?: string | null; }
export interface ModuleDetail { id: number; name: string; code: string; parentId?: number | null; sortOrder: number; icon?: string | null; route: string; isActive: boolean; }
export interface ModuleSavePayload { name: string; code: string; parentId?: number | null; sortOrder: number; icon?: string | null; route: string; isActive: boolean; }
export interface DepartmentItem { id: number; name: string; code: string; description?: string; isActive: boolean; tenantId?: number; tenantName?: string; createdAt: string; }
export interface DesignationItem { id: number; name: string; description?: string; isActive: boolean; tenantId?: number; tenantName?: string; createdAt: string; }
export interface ModuleAccessible { id: number; name: string; code: string; route: string; icon?: string; sortOrder: number; }
export interface ModuleRouteItem { id: number; moduleId: number; httpMethod: string; routePattern: string; requiredPermissionCode: string; description?: string; isActive: boolean; createdAt: string; }
export interface ModuleRouteCreatePayload { httpMethod: string; routePattern: string; requiredPermissionCode: string; description?: string | null; }
export interface ModuleRouteUpdatePayload { httpMethod: string; routePattern: string; requiredPermissionCode: string; description?: string | null; isActive: boolean; }
