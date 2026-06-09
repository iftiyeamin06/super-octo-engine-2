using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<RoleListDto>> GetAll([FromQuery] long? tenantId)
    {
        var q = db.Roles
            .Include(r => r.Tenant)
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
            .AsQueryable();

        if (tenantId.HasValue) q = q.Where(r => r.TenantId == tenantId || r.TenantId == null);

        return await q.OrderBy(r => r.Name).Select(r => new RoleListDto(
            r.Id, r.Name, r.Description, r.IsActive, r.IsSystem,
            r.TenantId, r.Tenant != null ? r.Tenant.Name : null,
            r.UserRoles.Count(ur => ur.IsActive),
            r.RolePermissions.Count(rp => rp.IsActive),
            r.CreatedAt)).ToListAsync();
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RoleDetailDto>> GetById(long id)
    {
        var role = await db.Roles
            .Include(r => r.Tenant)
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(r => r.RoleModules).ThenInclude(rm => rm.Module)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role is null) return NotFound();

        return new RoleDetailDto(role.Id, role.Name, role.Description, role.IsActive, role.IsSystem,
            role.TenantId,
            role.RolePermissions.Where(rp => rp.IsActive).Select(rp => new PermissionDto(
                rp.Permission.Id, rp.Permission.Code, rp.Permission.Name,
                rp.Permission.Description, rp.Permission.GroupName,
                rp.Permission.IsSystem, rp.Permission.IsActive)).ToList(),
            role.RoleModules.Where(rm => rm.IsActive).Select(rm => new ModuleDto(
                rm.Module.Id, rm.Module.Name, rm.Module.Code, rm.Module.Route,
                rm.Module.Icon, rm.Module.SortOrder, rm.Module.ParentId, rm.Module.IsActive)).ToList());
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] RoleCreateDto dto)
    {
        if (!dto.Name.Any()) return BadRequest("Name is required.");

        var role = new Role { Name = dto.Name, Description = dto.Description, TenantId = dto.TenantId };
        db.Roles.Add(role);
        await db.SaveChangesAsync();

        foreach (var pid in dto.PermissionIds)
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pid });
        foreach (var mid in dto.ModuleIds ?? [])
            db.RoleModules.Add(new RoleModule { RoleId = role.Id, ModuleId = mid });

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = role.Id }, new { role.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] RoleUpdateDto dto)
    {
        var role = await db.Roles
            .Include(r => r.RolePermissions)
            .Include(r => r.RoleModules)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role is null) return NotFound();
        if (role.IsSystem) return BadRequest("System roles cannot be modified.");

        role.Name = dto.Name; role.Description = dto.Description;
        role.IsActive = dto.IsActive; role.UpdatedAt = DateTime.UtcNow;

        db.RolePermissions.RemoveRange(role.RolePermissions);
        db.RoleModules.RemoveRange(role.RoleModules);

        foreach (var pid in dto.PermissionIds)
            db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = pid });
        foreach (var mid in dto.ModuleIds ?? [])
            db.RoleModules.Add(new RoleModule { RoleId = role.Id, ModuleId = mid });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var role = await db.Roles.FindAsync(id);
        if (role is null) return NotFound();
        if (role.IsSystem) return BadRequest("System roles cannot be deleted.");
        role.IsActive = false; role.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
