using CentralAuth.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entity, [FromQuery] string? action,
        [FromQuery] long? userId, [FromQuery] long? tenantId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = db.AuditHistories.Include(a => a.AppUser).AsQueryable();

        if (!string.IsNullOrWhiteSpace(entity)) q = q.Where(a => a.EntityName == entity);
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(a => a.ActionType == action);
        if (userId.HasValue)   q = q.Where(a => a.AppUserId == userId);
        if (tenantId.HasValue) q = q.Where(a => a.TenantId == tenantId);
        if (from.HasValue)     q = q.Where(a => a.CreatedAt >= from);
        if (to.HasValue)       q = q.Where(a => a.CreatedAt <= to);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new {
                a.Id, a.ActionType, a.EntityName, a.EntityKey,
                a.OldValues, a.NewValues, a.IpAddress, a.DeviceId,
                UserEmail = a.AppUser != null ? a.AppUser.Email : null,
                a.CreatedAt
            }).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("entities")]
    public async Task<List<string>> GetEntities() =>
        await db.AuditHistories.Select(a => a.EntityName).Distinct().OrderBy(e => e).ToListAsync();

    [HttpGet("actions")]
    public async Task<List<string>> GetActions() =>
        await db.AuditHistories.Select(a => a.ActionType).Distinct().OrderBy(a => a).ToListAsync();
}
