using System.Text.Json;
using CentralAuth.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CentralAuth.Api.Filters;

public class DynamicPermissionMiddleware
{
    private static readonly string[] BypassPrefixes =
        ["/swagger", "/health", "/api/auth"];

    private static readonly string CacheKey = "DynamicPermissionRoutes";
    private static readonly TimeSpan CacheSliding = TimeSpan.FromMinutes(5);

    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public DynamicPermissionMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context, IServiceScopeFactory scopeFactory)
    {
        var path = context.Request.Path.Value ?? "";
        var method = context.Request.Method;

        if (BypassPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        var routes = await GetCachedRoutesAsync(scopeFactory);

        var match = routes.FirstOrDefault(r =>
            (r.HttpMethod == "*" || string.Equals(r.HttpMethod, method, StringComparison.OrdinalIgnoreCase)) &&
            MatchPattern(r.RoutePattern, path));

        if (match is null)
        {
            await _next(context);
            return;
        }

        var user = context.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Authentication required." }));
            return;
        }

        // Direct route grant bypass — skip permission check if user has explicit route access
        var uidClaim = user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (uidClaim is not null && long.TryParse(uidClaim, out var userId))
        {
            using var directScope = scopeFactory.CreateScope();
            var directDb = directScope.ServiceProvider.GetRequiredService<CentralAuthDbContext>();
            var hasDirectGrant = await directDb.UserApiRoutes
                .AnyAsync(ur => ur.AppUserId == userId && ur.ApiServiceRouteId == match.Id && ur.IsActive);
            if (hasDirectGrant)
            {
                await _next(context);
                return;
            }
        }

        var hasPermission = user.HasClaim(c =>
            c.Type == "permission" && c.Value == match.RequiredPermissionCode);

        if (!hasPermission)
        {
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = "Insufficient permissions.",
                requiredPermission = match.RequiredPermissionCode
            }));
            return;
        }

        await _next(context);
    }

    private async Task<List<CachedRoute>> GetCachedRoutesAsync(IServiceScopeFactory scopeFactory)
    {
        if (_cache.TryGetValue(CacheKey, out List<CachedRoute>? routes) && routes is not null)
            return routes;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CentralAuthDbContext>();

        routes = await db.ApiServiceRoutes
            .Where(r => r.IsActive)
            .Select(r => new CachedRoute
            {
                Id = r.Id,
                HttpMethod = r.HttpMethod,
                RoutePattern = r.RoutePattern,
                RequiredPermissionCode = r.RequiredPermissionCode
            })
            .ToListAsync();

        _cache.Set(CacheKey, routes, new MemoryCacheEntryOptions
        {
            SlidingExpiration = CacheSliding
        });

        return routes;
    }

    private static bool MatchPattern(string pattern, string path)
    {
        var patternSegs = pattern.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        var pathSegs = path.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (patternSegs.Length != pathSegs.Length)
            return false;

        for (var i = 0; i < patternSegs.Length; i++)
        {
            if (patternSegs[i].Length > 1 &&
                patternSegs[i][0] == '{' &&
                patternSegs[i][^1] == '}')
                continue;

            if (!string.Equals(patternSegs[i], pathSegs[i], StringComparison.OrdinalIgnoreCase))
                return false;
        }

        return true;
    }

    private class CachedRoute
    {
        public long Id { get; set; }
        public string HttpMethod { get; set; } = string.Empty;
        public string RoutePattern { get; set; } = string.Empty;
        public string RequiredPermissionCode { get; set; } = string.Empty;
    }
}
