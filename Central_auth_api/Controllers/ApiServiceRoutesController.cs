using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/api-service-routes")]
public class ApiServiceRoutesController(CentralAuthDbContext db, IMemoryCache cache) : ControllerBase
{
    private static readonly string CacheKey = "DynamicPermissionRoutes";

    [HttpGet]
    public async Task<List<ApiServiceRouteListDto>> GetAll([FromQuery] long? serviceId)
    {
        var q = db.ApiServiceRoutes
            .Include(r => r.Service)
            .AsQueryable();

        if (serviceId.HasValue)
            q = q.Where(r => r.ServiceId == serviceId);

        return await q.OrderBy(r => r.HttpMethod).ThenBy(r => r.RoutePattern)
            .Select(r => new ApiServiceRouteListDto(
                r.Id, r.ServiceId, r.Service != null ? r.Service.Name : null,
                r.HttpMethod, r.RoutePattern, r.RequiredPermissionCode,
                r.Description, r.IsActive, r.CreatedAt))
            .ToListAsync();
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiServiceRouteDetailDto>> GetById(long id)
    {
        var r = await db.ApiServiceRoutes
            .Include(x => x.Service)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (r is null) return NotFound();

        return new ApiServiceRouteDetailDto(
            r.Id, r.ServiceId, r.Service?.Name,
            r.HttpMethod, r.RoutePattern, r.RequiredPermissionCode,
            r.Description, r.IsActive, r.CreatedAt, r.UpdatedAt);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] ApiServiceRouteCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.HttpMethod))
            return BadRequest("HttpMethod is required.");
        if (string.IsNullOrWhiteSpace(dto.RoutePattern))
            return BadRequest("RoutePattern is required.");
        if (string.IsNullOrWhiteSpace(dto.RequiredPermissionCode))
            return BadRequest("RequiredPermissionCode is required.");

        var route = new ApiServiceRoute
        {
            ServiceId = dto.ServiceId,
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
    public async Task<ActionResult> Update(long id, [FromBody] ApiServiceRouteUpdateDto dto)
    {
        var route = await db.ApiServiceRoutes.FindAsync(id);
        if (route is null) return NotFound();

        route.ServiceId = dto.ServiceId;
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

        route.IsActive = false;
        route.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        InvalidateCache();
        return NoContent();
    }

    private void InvalidateCache()
    {
        cache.Remove(CacheKey);
    }
}
