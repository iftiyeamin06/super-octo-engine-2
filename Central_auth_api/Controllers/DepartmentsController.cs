using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? tenantId)
    {
        var q = db.Departments.Include(d => d.Tenant).AsQueryable();
        if (tenantId.HasValue) q = q.Where(d => d.TenantId == tenantId);
        return Ok(await q.OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name, d.Code, d.Description, d.IsActive, d.TenantId, TenantName = d.Tenant != null ? d.Tenant.Name : null, d.CreatedAt })
            .ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] Department dto)
    {
        var dept = new Department { TenantId = dto.TenantId, Name = dto.Name, Code = dto.Code.ToUpperInvariant(), Description = dto.Description };
        db.Departments.Add(dept);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = dept.Id }, new { dept.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] Department dto)
    {
        var dept = await db.Departments.FindAsync(id);
        if (dept is null) return NotFound();
        dept.Name = dto.Name; dept.Description = dto.Description;
        dept.IsActive = dto.IsActive; dept.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var dept = await db.Departments.FindAsync(id);
        if (dept is null) return NotFound();
        dept.IsActive = false; dept.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
