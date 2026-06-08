using System.Security.Claims;
using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CentralAuth.Api.Filters;

public class DynamicPermissionFilter : IAsyncAuthorizationFilter
{
    private static readonly string[] BypassPrefixes =
        ["/swagger", "/health", "/api/auth"];

    private static readonly string CacheKey = "DynamicPermissionRoutes";
    private static readonly TimeSpan CacheSliding = TimeSpan.FromMinutes(5);

    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _scopeFactory;

    public DynamicPermissionFilter(IMemoryCache cache, IServiceScopeFactory scopeFactory)
    {
        _cache = cache;
        _scopeFactory = scopeFactory;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var httpContext = context.HttpContext;
        var path = httpContext.Request.Path.Value ?? "";
        var method = httpContext.Request.Method;

        if (BypassPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            return;

        var routes = await GetCachedRoutesAsync();

        var match = routes.FirstOrDefault(r =>
            (r.HttpMethod == "*" || string.Equals(r.HttpMethod, method, StringComparison.OrdinalIgnoreCase)) &&
            MatchPattern(r.RoutePattern, path));

        if (match is null)
            return;

        var user = httpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new JsonResult(new { message = "Authentication required." })
            {
                StatusCode = 401
            };
            return;
        }

        var hasPermission = user.HasClaim(c =>
            c.Type == "permission" && c.Value == match.RequiredPermissionCode);

        if (!hasPermission)
        {
            context.Result = new JsonResult(new
            {
                message = "Insufficient permissions.",
                requiredPermission = match.RequiredPermissionCode
            })
            {
                StatusCode = 403
            };
        }
    }

    private async Task<List<CachedRoute>> GetCachedRoutesAsync()
    {
        if (_cache.TryGetValue(CacheKey, out List<CachedRoute>? routes) && routes is not null)
            return routes;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CentralAuthDbContext>();

        routes = await db.ApiServiceRoutes
            .Where(r => r.IsActive)
            .Select(r => new CachedRoute
            {
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
        public string HttpMethod { get; set; } = string.Empty;
        public string RoutePattern { get; set; } = string.Empty;
        public string RequiredPermissionCode { get; set; } = string.Empty;
    }
}
