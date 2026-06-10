namespace CentralAuth.Api.DTOs;

public record RoleListDto(
    long Id, string Name, string? Description, bool IsActive, bool IsSystem,
    long? TenantId, string? TenantName,
    int UserCount, int PermissionCount, DateTime CreatedAt);

public record RoleDetailDto(
    long Id, string Name, string? Description, bool IsActive, bool IsSystem,
    long? TenantId, List<PermissionDto> Permissions, List<ModuleDto> Modules);

public record RoleCreateDto(string Name, string? Description, long? TenantId, List<long> PermissionIds, List<long>? ModuleIds);
public record RoleUpdateDto(string Name, string? Description, bool IsActive, List<long> PermissionIds, List<long>? ModuleIds);

public record PermissionDto(long Id, string Code, string Name, string? Description, string? GroupName, bool IsSystem, bool IsActive);
public record CreatePermissionDto(string Code, string Name, string? Description, string? GroupName);
public record ModuleDto(long Id, string Name, string Code, string Route, string? Icon, int SortOrder, long? ParentId, bool IsActive);
public record ModuleListItemDto(long Id, string Name, string Code, string Route, long? ParentId, bool IsActive, DateTime CreatedAt, DateTime? UpdatedAt);
public record ModuleDetailDto(long Id, string Name, string Code, long? ParentId, int SortOrder, string? Icon, string Route, bool IsActive);
public record ModuleSaveDto(string Name, string Code, long? ParentId, int SortOrder, string? Icon, string Route, bool IsActive);
public record ModuleAccessibleDto(long Id, string Name, string Code, string Route, string? Icon, int SortOrder);
public record ModulePermissionsUpdateDto(List<long> PermissionIds);
public record ModuleRouteListItemDto(long Id, long ModuleId, string HttpMethod, string RoutePattern, string RequiredPermissionCode, string? Description, bool IsActive, DateTime CreatedAt);
public record ModuleRouteCreateDto(string HttpMethod, string RoutePattern, string RequiredPermissionCode, string? Description);
public record ModuleRouteUpdateDto(string HttpMethod, string RoutePattern, string RequiredPermissionCode, string? Description, bool IsActive);
