namespace CentralAuth.Api.DTOs;

public record RoleSummaryDto(long Id, string Name, string? Description);
public record PermissionSummaryDto(long Id, string Code, string Name, string? GroupName);
public record ModuleAccessSummaryDto(long Id, string Name, string Code, string Route);
public record RouteAccessSummaryDto(long Id, string HttpMethod, string RoutePattern, string? RequiredPermissionCode);
public record SessionSummaryDto(string SessionId, string? IpAddress, string? UserAgent, DateTime LoginAtUtc, DateTime ExpiresAtUtc, bool IsActive);
public record AuditSummaryDto(long Id, string ActionType, string EntityName, string EntityKey, string? IpAddress, DateTime CreatedAt);

public record UserProfileDto(
    long Id, string FirstName, string LastName, string Email, string UserName,
    string? PhoneNumber,
    string? EmployeeId,
    string? ProfilePhotoStorageKey, bool IsActive, bool IsLocked, bool TwoFactorEnabled,
    int FailedLoginAttempts, DateTime? LastLoginAt, DateTime CreatedAt, DateTime? UpdatedAt,
    long? TenantId, string? TenantName,
    long? DepartmentId, string? DepartmentName,
    long? DesignationId, string? DesignationName,
    List<RoleSummaryDto> Roles,
    List<PermissionSummaryDto> Permissions,
    List<ModuleAccessSummaryDto> ModuleAccesses,
    List<RouteAccessSummaryDto> RouteAccesses,
    List<SessionSummaryDto> Sessions,
    List<AuditSummaryDto> RecentAudit);
