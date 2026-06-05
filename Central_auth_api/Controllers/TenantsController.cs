using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<TenantListDto>> GetAll()
    {
        return await db.Tenants
            .OrderBy(t => t.Name)
            .Select(t => new TenantListDto(
                t.Id, t.Name, t.Code, t.Description, t.ContactEmail,
                t.LogoUrl, t.SubscriptionPlan, t.SubscriptionExpiresAt,
                t.IsActive, t.CreatedAt, t.TenantUsers.Count(tu => tu.IsActive)))
            .ToListAsync();
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TenantListDto>> GetById(long id)
    {
        var t = await db.Tenants.Include(t => t.TenantUsers).FirstOrDefaultAsync(t => t.Id == id);
        if (t is null) return NotFound();
        return new TenantListDto(t.Id, t.Name, t.Code, t.Description, t.ContactEmail,
            t.LogoUrl, t.SubscriptionPlan, t.SubscriptionExpiresAt,
            t.IsActive, t.CreatedAt, t.TenantUsers.Count(tu => tu.IsActive));
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] TenantCreateDto dto)
    {
        var tenant = new Tenant
        {
            Name = dto.Name, Code = dto.Code.ToUpperInvariant(), Description = dto.Description,
            ContactEmail = dto.ContactEmail, LogoUrl = dto.LogoUrl,
            SubscriptionPlan = dto.SubscriptionPlan, SubscriptionExpiresAt = dto.SubscriptionExpiresAt
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, new { tenant.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] TenantUpdateDto dto)
    {
        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();
        tenant.Name = dto.Name; tenant.Description = dto.Description;
        tenant.ContactEmail = dto.ContactEmail; tenant.LogoUrl = dto.LogoUrl;
        tenant.SubscriptionPlan = dto.SubscriptionPlan;
        tenant.SubscriptionExpiresAt = dto.SubscriptionExpiresAt;
        tenant.IsActive = dto.IsActive; tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();
        tenant.IsActive = false; tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
