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
    long? TenantId, string FirstName, string LastName,
    string Email, string UserName, string Password,
    string? PhoneNumber, long? DepartmentId, long? DesignationId,
    List<long> RoleIds);

public record UserUpdateDto(
    long? TenantId, string FirstName, string LastName, string? PhoneNumber,
    long? DepartmentId, long? DesignationId, bool IsActive,
    List<long> RoleIds);
