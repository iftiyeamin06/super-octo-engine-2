namespace CentralAuth.Api.DTOs;

public record RouteListItemDto(
    long Id, long ModuleId, string ModuleName,
    string HttpMethod, string RoutePattern, string RequiredPermissionCode,
    string? Description, bool IsActive, DateTime CreatedAt);

public record RouteCreateDto(
    long ModuleId, string HttpMethod, string RoutePattern,
    string RequiredPermissionCode, string? Description);

public record RouteUpdateDto(
    long ModuleId, string HttpMethod, string RoutePattern,
    string RequiredPermissionCode, string? Description, bool IsActive);
