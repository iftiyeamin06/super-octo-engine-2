using CentralAuth.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionsController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var activeSessions = await db.UserLoginSessions.CountAsync(s => s.IsActive && s.ExpiresAtUtc > now);
        var totalSessions = await db.UserLoginSessions.CountAsync();
        var usersOnline = await db.UserLoginSessions.CountAsync(s => s.IsActive && s.ExpiresAtUtc > now);
        return Ok(new { activeSessions, totalSessions, usersOnline });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] long? userId, [FromQuery] bool? activeOnly,
        [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = db.UserLoginSessions.Include(s => s.AppUser).AsQueryable();
        if (userId.HasValue) q = q.Where(s => s.AppUserId == userId);
        if (activeOnly.HasValue && activeOnly.Value) q = q.Where(s => s.IsActive && s.ExpiresAtUtc > DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToUpperInvariant();
            q = q.Where(s => s.AppUser.NormalizedEmail.Contains(term)
                || (s.IpAddress != null && s.IpAddress.Contains(term))
                || (s.DeviceId != null && s.DeviceId.Contains(term)));
        }

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
            s.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return Ok(new { revoked = sessions.Count });
    }
}
