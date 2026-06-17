using System.Security.Claims;
using CentralAuth.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Middleware;

public class SessionActivityMiddleware(RequestDelegate next, IConfiguration config)
{
    private static readonly Dictionary<long, DateTime> _lastUpdates = new();
    private static readonly object _lock = new();
    private static readonly TimeSpan Throttle = TimeSpan.FromSeconds(30);

    public async Task InvokeAsync(HttpContext context, CentralAuthDbContext db)
    {
        await next(context);

        if (context.Response.StatusCode is < 200 or >= 300) return;

        var uidClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (uidClaim is null || !long.TryParse(uidClaim, out var userId)) return;

        var now = DateTime.UtcNow;
        lock (_lock)
        {
            if (_lastUpdates.TryGetValue(userId, out var last) && (now - last) < Throttle) return;
            _lastUpdates[userId] = now;
        }

        var session = await db.UserLoginSessions
            .Where(s => s.AppUserId == userId && s.IsActive && s.ExpiresAtUtc > now)
            .OrderByDescending(s => s.LoginAtUtc)
            .FirstOrDefaultAsync();

        if (session is null) return;

        var sessionDurationMinutes = double.Parse(
            config["Jwt:SessionDurationMinutes"]
            ?? config["Jwt:ExpiryMinutes"]
            ?? "60");
        session.ExpiresAtUtc = now.AddMinutes(sessionDurationMinutes);
        session.LastSeenAtUtc = now;
        await db.SaveChangesAsync();
    }
}
