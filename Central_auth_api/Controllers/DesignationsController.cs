using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DesignationsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? tenantId)
    {
        var q = db.Designations.Include(d => d.Tenant).AsQueryable();
        if (tenantId.HasValue) q = q.Where(d => d.TenantId == tenantId);
        return Ok(await q.OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name, d.Description, d.IsActive, d.TenantId, TenantName = d.Tenant != null ? d.Tenant.Name : null, d.CreatedAt })
            .ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] Designation dto)
    {
        var desig = new Designation { TenantId = dto.TenantId, Name = dto.Name, Description = dto.Description };
        db.Designations.Add(desig);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = desig.Id }, new { desig.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] Designation dto)
    {
        var desig = await db.Designations.FindAsync(id);
        if (desig is null) return NotFound();
        desig.Name = dto.Name; desig.Description = dto.Description;
        desig.IsActive = dto.IsActive; desig.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var desig = await db.Designations.FindAsync(id);
        if (desig is null) return NotFound();
        desig.IsActive = false; desig.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
