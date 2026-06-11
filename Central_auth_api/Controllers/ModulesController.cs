using System.Security.Claims;
using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModulesController(CentralAuthDbContext db, IMemoryCache cache) : ControllerBase
{
    private static readonly string CacheKey = "DynamicPermissionRoutes";
    [HttpGet]
    public async Task<List<ModuleListItemDto>> GetAll() =>
        await db.Modules
            .AsNoTracking()
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .Select(m => new ModuleListItemDto(m.Id, m.Name, m.Code, m.Route, m.ParentId, m.IsActive, m.CreatedAt, m.UpdatedAt))
            .ToListAsync();

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ModuleDetailDto>> GetById(long id)
    {
        var module = await db.Modules.AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new ModuleDetailDto(m.Id, m.Name, m.Code, m.ParentId, m.SortOrder, m.Icon, m.Route, m.IsActive))
            .FirstOrDefaultAsync();

        return module is null ? NotFound() : Ok(module);
    }

    [HttpGet("{id:long}/pages")]
    public async Task<List<object>> GetPages(long id) =>
        await db.Pages.Where(p => p.ModuleId == id).OrderBy(p => p.SortOrder)
            .Select(p => (object)new { p.Id, p.Name, p.Route, p.SortOrder, p.Icon, p.IsActive })
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] ModuleSaveDto dto)
    {
        var module = new Module
        {
            Name = dto.Name,
            Code = dto.Code,
            ParentId = dto.ParentId,
            SortOrder = dto.SortOrder,
            Icon = dto.Icon,
            Route = dto.Route,
            IsActive = dto.IsActive
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] ModuleSaveDto dto)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        module.Name = dto.Name;
        module.Code = dto.Code;
        module.ParentId = dto.ParentId;
        module.SortOrder = dto.SortOrder;
        module.Icon = dto.Icon;
        module.Route = dto.Route;
        module.IsActive = dto.IsActive;
        module.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        db.Modules.Remove(module);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("accessible")]
    public async Task<List<ModuleAccessibleDto>> GetAccessible()
    {
        var uidClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (uidClaim is null || !long.TryParse(uidClaim, out var userId))
            return [];

        var rolePermIds = await db.UserRoles
            .Where(ur => ur.AppUserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.PermissionId)
            .Distinct()
            .ToListAsync();

        var directPermIds = await db.UserPermissions
            .Where(up => up.AppUserId == userId)
            .Select(up => up.PermissionId)
            .ToListAsync();

        var userPermissionIds = rolePermIds.Union(directPermIds).Distinct().ToList();

        var permModuleIds = await db.ModulePermissions
            .Where(mp => userPermissionIds.Contains(mp.PermissionId))
            .Select(mp => mp.ModuleId)
            .Distinct()
            .ToListAsync();

        var explicitModuleIds = await db.UserModuleAccesses
            .Where(uma => uma.AppUserId == userId && uma.IsActive)
            .Select(uma => uma.ModuleId)
            .ToListAsync();

        var routeModuleIds = await db.UserApiRoutes
            .Where(ur => ur.AppUserId == userId && ur.IsActive)
            .Select(ur => ur.ApiServiceRoute.ModuleId)
            .Distinct()
            .ToListAsync();

        var allModuleIds = permModuleIds.Union(explicitModuleIds).Union(routeModuleIds).Distinct().ToList();

        return await db.Modules
            .AsNoTracking()
            .Where(m => m.IsActive && allModuleIds.Contains(m.Id))
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .Select(m => new ModuleAccessibleDto(m.Id, m.Name, m.Code, m.Route, m.Icon, m.SortOrder))
            .ToListAsync();
    }

    [HttpGet("{id:long}/permissions")]
    public async Task<ActionResult<List<long>>> GetPermissions(long id)
    {
        var exists = await db.Modules.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound();

        var ids = await db.ModulePermissions
            .Where(mp => mp.ModuleId == id)
            .Select(mp => mp.PermissionId)
            .ToListAsync();

        return Ok(ids);
    }

    [HttpPut("{id:long}/permissions")]
    public async Task<ActionResult> UpdatePermissions(long id, [FromBody] ModulePermissionsUpdateDto dto)
    {
        var module = await db.Modules.Include(m => m.ModulePermissions).FirstOrDefaultAsync(m => m.Id == id);
        if (module is null) return NotFound();

        db.ModulePermissions.RemoveRange(module.ModulePermissions);
        module.ModulePermissions = dto.PermissionIds.Select(pid => new ModulePermission
        {
            ModuleId = id,
            PermissionId = pid
        }).ToList();

        await db.SaveChangesAsync();
        return Ok();
    }

    // ── Route CRUD ─────────────────────────────────────────────────────

    [HttpGet("{id:long}/routes")]
    public async Task<ActionResult<List<ModuleRouteListItemDto>>> GetRoutes(long id)
    {
        var exists = await db.Modules.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound();

        return await db.ApiServiceRoutes
            .AsNoTracking()
            .Where(r => r.ModuleId == id)
            .OrderBy(r => r.HttpMethod)
            .ThenBy(r => r.RoutePattern)
            .Select(r => new ModuleRouteListItemDto(r.Id, r.ModuleId, r.HttpMethod, r.RoutePattern, r.RequiredPermissionCode, r.Description, r.IsActive, r.CreatedAt))
            .ToListAsync();
    }

    [HttpPost("{id:long}/routes")]
    public async Task<ActionResult> CreateRoute(long id, [FromBody] ModuleRouteCreateDto dto)
    {
        var exists = await db.Modules.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.HttpMethod)) return BadRequest("HttpMethod is required.");
        if (string.IsNullOrWhiteSpace(dto.RoutePattern)) return BadRequest("RoutePattern is required.");
        if (string.IsNullOrWhiteSpace(dto.RequiredPermissionCode)) return BadRequest("RequiredPermissionCode is required.");

        var route = new ApiServiceRoute
        {
            ModuleId = id,
            HttpMethod = dto.HttpMethod.ToUpperInvariant(),
            RoutePattern = dto.RoutePattern,
            RequiredPermissionCode = dto.RequiredPermissionCode,
            Description = dto.Description
        };

        db.ApiServiceRoutes.Add(route);
        await db.SaveChangesAsync();
        InvalidateCache();

        return CreatedAtAction(nameof(GetRoutes), new { id }, new { route.Id });
    }

    [HttpPut("{id:long}/routes/{routeId:long}")]
    public async Task<ActionResult> UpdateRoute(long id, long routeId, [FromBody] ModuleRouteUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.HttpMethod) || string.IsNullOrWhiteSpace(dto.RoutePattern) || string.IsNullOrWhiteSpace(dto.RequiredPermissionCode))
            return BadRequest(new { message = "HttpMethod, RoutePattern, and RequiredPermissionCode are required." });

        var route = await db.ApiServiceRoutes.FirstOrDefaultAsync(r => r.Id == routeId && r.ModuleId == id);
        if (route is null) return NotFound();

        route.HttpMethod = dto.HttpMethod.ToUpperInvariant();
        route.RoutePattern = dto.RoutePattern;
        route.RequiredPermissionCode = dto.RequiredPermissionCode;
        route.Description = dto.Description;
        route.IsActive = dto.IsActive;
        route.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        InvalidateCache();
        return NoContent();
    }

    [HttpDelete("{id:long}/routes/{routeId:long}")]
    public async Task<ActionResult> DeleteRoute(long id, long routeId)
    {
        var route = await db.ApiServiceRoutes.FirstOrDefaultAsync(r => r.Id == routeId && r.ModuleId == id);
        if (route is null) return NotFound();

        db.ApiServiceRoutes.Remove(route);
        await db.SaveChangesAsync();
        InvalidateCache();
        return NoContent();
    }

    private void InvalidateCache()
    {
        cache.Remove(CacheKey);
    }
}
