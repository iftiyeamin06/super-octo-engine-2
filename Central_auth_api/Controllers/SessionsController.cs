using CentralAuth.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] long? userId, [FromQuery] bool? active,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = db.UserLoginSessions.Include(s => s.AppUser).AsQueryable();
        if (userId.HasValue) q = q.Where(s => s.AppUserId == userId);
        if (active.HasValue) q = q.Where(s => active.Value
            ? s.IsActive && s.ExpiresAtUtc > DateTime.UtcNow
            : !s.IsActive || s.ExpiresAtUtc <= DateTime.UtcNow);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.LoginAtUtc)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new {
                s.Id, s.SessionId, s.AppUserId,
                UserEmail = s.AppUser.Email,
                s.DeviceId, s.IpAddress, s.UserAgent,
                s.LoginAtUtc, s.LastSeenAtUtc, s.ExpiresAtUtc,
                s.EndedAtUtc, s.EndedReason, s.IsActive
            }).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpDelete("{id:long}/revoke")]
    public async Task<ActionResult> Revoke(long id, [FromQuery] string? reason)
    {
        var session = await db.UserLoginSessions.FindAsync(id);
        if (session is null) return NotFound();
        session.IsActive = false;
        session.EndedAtUtc = DateTime.UtcNow;
        session.EndedReason = reason ?? "AdminRevoked";
        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("user/{userId:long}/revoke-all")]
    public async Task<ActionResult> RevokeAll(long userId)
    {
        var sessions = await db.UserLoginSessions
            .Where(s => s.AppUserId == userId && s.IsActive).ToListAsync();
        foreach (var s in sessions)
        {
            s.IsActive = false;
            s.EndedAtUtc = DateTime.UtcNow;
            s.EndedReason = "AdminRevokedAll";
        }
        await db.SaveChangesAsync();
        return Ok(new { revoked = sessions.Count });
    }
}
