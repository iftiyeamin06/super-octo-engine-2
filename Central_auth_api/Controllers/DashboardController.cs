using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<DashboardStatsDto> GetStats()
    {
        var now = DateTime.UtcNow;
        return new DashboardStatsDto(
            await db.AppUsers.CountAsync(),
            await db.AppUsers.CountAsync(u => u.IsActive && !u.IsLocked),
            await db.AppUsers.CountAsync(u => u.IsActive && u.IsLocked),
            await db.UserLoginSessions.CountAsync(s => s.IsActive && s.ExpiresAtUtc > now),
            await db.Roles.CountAsync(r => r.IsActive),
            await db.Tenants.CountAsync(t => t.IsActive),
            await db.Services.CountAsync(s => s.IsActive),
            await db.ServiceApiKeys.CountAsync(k => k.ExpiresAt == null || k.ExpiresAt > now),
            await db.OtpVerifications.CountAsync(o => o.IsActive && o.VerifiedAt == null && o.ExpiresAt > now),
            await db.Modules.CountAsync(m => m.IsActive),
            await db.Permissions.CountAsync(p => p.IsActive)
        );
    }

    [HttpGet("recent-users")]
    public async Task<List<RecentUserDto>> GetRecentUsers([FromQuery] int count = 10)
    {
        return await db.AppUsers
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Take(count)
            .Select(u => new RecentUserDto(
                u.Id,
                (u.FirstName + " " + u.LastName).Trim(),
                u.Email,
                u.UserRoles.Where(ur => ur.IsActive).Select(ur => ur.Role.Name).FirstOrDefault(),
                u.TenantUsers.Select(tu => tu.Tenant!.Name).FirstOrDefault(),
                u.IsActive, u.IsLocked, u.CreatedAt))
            .ToListAsync();
    }

    [HttpGet("recent-audit")]
    public async Task<List<AuditActivityDto>> GetRecentAudit([FromQuery] int count = 20)
    {
        return await db.AuditHistories
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(count)
            .Select(a => new AuditActivityDto(
                a.Id, a.ActionType, a.EntityName,
                a.AppUser != null ? a.AppUser.Email : null,
                a.IpAddress, a.CreatedAt))
            .ToListAsync();
    }

}
