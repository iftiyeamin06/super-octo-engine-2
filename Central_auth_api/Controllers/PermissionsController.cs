using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PermissionsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<PermissionDto>> GetAll([FromQuery] string? group)
    {
        var q = db.Permissions.AsQueryable();
        if (!string.IsNullOrWhiteSpace(group)) q = q.Where(p => p.GroupName == group);
        return await q.OrderBy(p => p.GroupName).ThenBy(p => p.Name)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Name, p.Description, p.GroupName, p.IsSystem, p.IsActive))
            .ToListAsync();
    }

    [HttpGet("groups")]
    public async Task<List<string>> GetGroups() =>
        await db.Permissions.Where(p => p.GroupName != null)
            .Select(p => p.GroupName!).Distinct().OrderBy(g => g).ToListAsync();

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] PermissionDto dto)
    {
        var perm = new Permission { Code = dto.Code, Name = dto.Name, Description = dto.Description, GroupName = dto.GroupName };
        db.Permissions.Add(perm);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = perm.Id }, new { perm.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] PermissionDto dto)
    {
        var perm = await db.Permissions.FindAsync(id);
        if (perm is null) return NotFound();
        if (perm.IsSystem) return BadRequest("System permissions cannot be modified.");
        perm.Name = dto.Name; perm.Description = dto.Description;
        perm.GroupName = dto.GroupName; perm.IsActive = dto.IsActive;
        perm.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var perm = await db.Permissions.FindAsync(id);
        if (perm is null) return NotFound();
        if (perm.IsSystem) return BadRequest("System permissions cannot be deleted.");
        perm.IsActive = false; perm.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
