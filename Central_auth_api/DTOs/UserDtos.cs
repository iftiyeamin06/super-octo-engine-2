namespace CentralAuth.Api.DTOs;

public record UserListDto(
    long Id, string FirstName, string LastName, string Email, string UserName,
    string? EmployeeId,
    string? ProfilePhotoStorageKey, bool IsActive, bool IsLocked, bool TwoFactorEnabled,
    int FailedLoginAttempts, DateTime? LastLoginAt, DateTime CreatedAt,
    long? TenantId, string? TenantName,
    long? DepartmentId, string? DepartmentName,
    long? DesignationId, string? DesignationName,
    List<string> Roles);

public record UserCreateDto(
    List<long> TenantIds, string FirstName, string LastName,
    string Email, string UserName, string Password,
    string? PhoneNumber, long DepartmentId, long DesignationId,
    List<long> RoleIds);

public record UserUpdateDto(
    List<long>? TenantIds, string FirstName, string LastName, string? PhoneNumber,
    long DepartmentId, long DesignationId, bool IsActive,
    List<long> RoleIds, string? Password = null);

public record UserRoleUpdateDto(List<long> RoleIds);
public record UserPermissionUpdateDto(List<long> PermissionIds);
public record UserModuleAccessUpdateDto(List<long> ModuleIds);
public record UserRouteAccessUpdateDto(List<long> RouteIds);
