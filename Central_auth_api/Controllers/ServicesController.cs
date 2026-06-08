using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await db.Services.Include(s => s.ApiKeys)
            .Select(s => new { s.Id, s.Name, s.Code, s.Description, s.BaseUrl, s.IsActive, s.CreatedAt, ApiKeyCount = s.ApiKeys.Count(k => k.IsActive) })
            .ToListAsync());

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] Service dto)
    {
        var svc = new Service { Name = dto.Name, Code = dto.Code.ToUpperInvariant(), Description = dto.Description, BaseUrl = dto.BaseUrl };
        db.Services.Add(svc);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = svc.Id }, new { svc.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] Service dto)
    {
        var svc = await db.Services.FindAsync(id);
        if (svc is null) return NotFound();
        svc.Name = dto.Name; svc.Description = dto.Description;
        svc.BaseUrl = dto.BaseUrl; svc.IsActive = dto.IsActive;
        svc.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:long}/api-keys")]
    public async Task<ActionResult> AddApiKey(long id, [FromBody] AddApiKeyRequest dto)
    {
        var svc = await db.Services.FindAsync(id);
        if (svc is null) return NotFound();
        var rawKey = $"sk-{Guid.NewGuid():N}";
        var key = new ServiceApiKey
        {
            ServiceId = id,
            Description = dto.Description,
            ExpiresAt = dto.ExpiresAt,
            KeyHash = BCrypt.Net.BCrypt.HashPassword(rawKey)
        };
        db.ServiceApiKeys.Add(key);
        await db.SaveChangesAsync();
        return Ok(new { key.Id, key.Description, key.ExpiresAt, apiKey = rawKey });
    }

    public record AddApiKeyRequest(string? Description, DateTime? ExpiresAt);

    [HttpDelete("{id:long}/api-keys/{keyId:long}")]
    public async Task<ActionResult> RevokeApiKey(long id, long keyId)
    {
        var key = await db.ServiceApiKeys.FirstOrDefaultAsync(k => k.Id == keyId && k.ServiceId == id);
        if (key is null) return NotFound();
        key.IsActive = false;
        key.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
