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
        // Single round-trip: all 11 counts in one SQL query
        var now = DateTime.UtcNow;
        var result = await db.Database.SqlQueryRaw<DashboardStatsRaw>(@"
            SELECT
              (SELECT COUNT(*) FROM auth_appusers)                                                             AS TotalUsers,
              (SELECT COUNT(*) FROM auth_appusers      WHERE IsActive = 1 AND IsLocked = 0)                   AS ActiveUsers,
              (SELECT COUNT(*) FROM auth_appusers      WHERE IsActive = 1 AND IsLocked = 1)                   AS LockedUsers,
              (SELECT COUNT(*) FROM auth_userloginsessions WHERE IsActive = 1 AND ExpiresAtUtc > {0})         AS ActiveSessions,
              (SELECT COUNT(*) FROM auth_roles          WHERE IsActive = 1)                                   AS TotalRoles,
              (SELECT COUNT(*) FROM auth_tenants        WHERE IsActive = 1)                                   AS TotalTenants,
              (SELECT COUNT(*) FROM auth_services       WHERE IsActive = 1)                                   AS TotalServices,
              (SELECT COUNT(*) FROM auth_serviceapikeys WHERE IsActive = 1)                                   AS TotalApiKeys,
              (SELECT COUNT(*) FROM auth_otpverifications WHERE IsActive = 1 AND VerifiedAt IS NULL AND ExpiresAt > {0}) AS PendingOtps,
              (SELECT COUNT(*) FROM auth_modules        WHERE IsActive = 1)                                   AS TotalModules,
              (SELECT COUNT(*) FROM auth_permissions    WHERE IsActive = 1)                                   AS TotalPermissions
        ", now).FirstOrDefaultAsync();

        return result is null
            ? new DashboardStatsDto(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            : new DashboardStatsDto(
                result.TotalUsers, result.ActiveUsers, result.LockedUsers,
                result.ActiveSessions, result.TotalRoles, result.TotalTenants,
                result.TotalServices, result.TotalApiKeys, result.PendingOtps,
                result.TotalModules, result.TotalPermissions);
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
                u.Tenant != null ? u.Tenant.Name : null,
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

    // Internal DTO for raw SQL projection
    private class DashboardStatsRaw
    {
        public int TotalUsers      { get; set; }
        public int ActiveUsers     { get; set; }
        public int LockedUsers     { get; set; }
        public int ActiveSessions  { get; set; }
        public int TotalRoles      { get; set; }
        public int TotalTenants    { get; set; }
        public int TotalServices   { get; set; }
        public int TotalApiKeys    { get; set; }
        public int PendingOtps     { get; set; }
        public int TotalModules    { get; set; }
        public int TotalPermissions{ get; set; }
    }
}
