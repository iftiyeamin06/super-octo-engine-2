namespace CentralAuth.Api.DTOs;

public record DashboardStatsDto(
    int TotalUsers, int ActiveUsers, int LockedUsers,
    int ActiveSessions, int TotalRoles, int TotalTenants,
    int TotalServices, int TotalApiKeys, int PendingOtps,
    int TotalModules, int TotalPermissions);

public record RecentUserDto(long Id, string FullName, string Email, string? Role, string? Tenant, bool IsActive, bool IsLocked, DateTime CreatedAt);
public record AuditActivityDto(long Id, string ActionType, string EntityName, string? UserEmail, string? IpAddress, DateTime CreatedAt);
