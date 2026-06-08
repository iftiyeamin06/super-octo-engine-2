namespace CentralAuth.Api.DTOs;

public record ApiServiceRouteListDto(
    long Id, long? ServiceId, string? ServiceName,
    string HttpMethod, string RoutePattern, string RequiredPermissionCode,
    string? Description, bool IsActive, DateTime CreatedAt);

public record ApiServiceRouteDetailDto(
    long Id, long? ServiceId, string? ServiceName,
    string HttpMethod, string RoutePattern, string RequiredPermissionCode,
    string? Description, bool IsActive, DateTime CreatedAt, DateTime? UpdatedAt);

public record ApiServiceRouteCreateDto(
    long? ServiceId, string HttpMethod, string RoutePattern,
    string RequiredPermissionCode, string? Description);

public record ApiServiceRouteUpdateDto(
    long? ServiceId, string HttpMethod, string RoutePattern,
    string RequiredPermissionCode, string? Description, bool IsActive);
