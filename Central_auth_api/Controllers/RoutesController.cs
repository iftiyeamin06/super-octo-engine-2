using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoutesController(CentralAuthDbContext db, IMemoryCache cache) : ControllerBase
{
    private static readonly string CacheKey = "DynamicPermissionRoutes";

    [HttpGet]
    public async Task<ActionResult<List<RouteListItemDto>>> GetAll([FromQuery] long? moduleId)
    {
        var query = db.ApiServiceRoutes
            .AsNoTracking()
            .Include(r => r.Module)
            .AsQueryable();

        if (moduleId.HasValue)
            query = query.Where(r => r.ModuleId == moduleId.Value);

        return await query
            .OrderBy(r => r.Module.Name)
            .ThenBy(r => r.HttpMethod)
            .ThenBy(r => r.RoutePattern)
            .Select(r => new RouteListItemDto(
                r.Id, r.ModuleId, r.Module.Name,
                r.HttpMethod, r.RoutePattern, r.RequiredPermissionCode,
                r.Description, r.IsActive, r.CreatedAt))
            .ToListAsync();
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RouteListItemDto>> GetById(long id)
    {
        var route = await db.ApiServiceRoutes
            .AsNoTracking()
            .Include(r => r.Module)
            .Where(r => r.Id == id)
            .Select(r => new RouteListItemDto(
                r.Id, r.ModuleId, r.Module.Name,
                r.HttpMethod, r.RoutePattern, r.RequiredPermissionCode,
                r.Description, r.IsActive, r.CreatedAt))
            .FirstOrDefaultAsync();

        return route is null ? NotFound() : Ok(route);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] RouteCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.HttpMethod))
            return BadRequest(new { message = "HttpMethod is required." });
        if (string.IsNullOrWhiteSpace(dto.RoutePattern))
            return BadRequest(new { message = "RoutePattern is required." });
        if (string.IsNullOrWhiteSpace(dto.RequiredPermissionCode))
            return BadRequest(new { message = "RequiredPermissionCode is required." });

        var moduleExists = await db.Modules.AnyAsync(m => m.Id == dto.ModuleId);
        if (!moduleExists)
            return BadRequest(new { message = "Module not found." });

        var route = new ApiServiceRoute
        {
            ModuleId = dto.ModuleId,
            HttpMethod = dto.HttpMethod.ToUpperInvariant(),
            RoutePattern = dto.RoutePattern,
            RequiredPermissionCode = dto.RequiredPermissionCode,
            Description = dto.Description
        };

        db.ApiServiceRoutes.Add(route);
        await db.SaveChangesAsync();
        InvalidateCache();

        return CreatedAtAction(nameof(GetById), new { id = route.Id }, new { route.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] RouteUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.HttpMethod) || string.IsNullOrWhiteSpace(dto.RoutePattern) || string.IsNullOrWhiteSpace(dto.RequiredPermissionCode))
            return BadRequest(new { message = "HttpMethod, RoutePattern, and RequiredPermissionCode are required." });

        var route = await db.ApiServiceRoutes.FindAsync(id);
        if (route is null) return NotFound();

        var moduleExists = await db.Modules.AnyAsync(m => m.Id == dto.ModuleId);
        if (!moduleExists)
            return BadRequest(new { message = "Module not found." });

        route.ModuleId = dto.ModuleId;
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

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var route = await db.ApiServiceRoutes.FindAsync(id);
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
