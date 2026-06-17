using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(CentralAuthDbContext db, IConfiguration cfg) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return Unauthorized(new { message = "Invalid email or password." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (user is null)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "Login Failed", EntityName = "AppUser", EntityKey = "",
                IpAddress = ip, CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // C1+C2: Check lockout BEFORE password verification
        if (user.IsLocked)
        {
            // Auto-unlock if lockout period has expired
            if (user.LockoutEnd.HasValue && user.LockoutEnd <= DateTime.UtcNow)
            {
                user.IsLocked = false;
                user.LockoutEnd = null;
                user.FailedLoginAttempts = 0;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                db.AuditHistories.Add(new AuditHistory
                {
                    ActionType = "Login Failed", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                    AppUserId = user.Id, IpAddress = ip, CreatedAt = DateTime.UtcNow, IsActive = true
                });
                await db.SaveChangesAsync();
                return Unauthorized(new { message = "Invalid email or password." });
            }
        }

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.IsLocked = true;
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(30);
            }
            user.UpdatedAt = DateTime.UtcNow;

            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "Login Failed", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                AppUserId = user.Id, IpAddress = ip, CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var roles = user.UserRoles.Where(ur => ur.Role is not null).Select(ur => ur.Role!.Name).ToList();
        var permissions = user.UserRoles
            .Where(ur => ur.Role is not null)
            .SelectMany(ur => ur.Role!.RolePermissions)
            .Where(rp => rp.IsActive && rp.Permission is not null)
            .Select(rp => rp.Permission!.Code)
            .Distinct()
            .ToList();

        var directPerms = await db.UserPermissions
            .Where(up => up.AppUserId == user.Id && up.IsActive)
            .Select(up => up.Permission.Code)
            .Distinct()
            .ToListAsync();

        permissions.AddRange(directPerms);

        var token = BuildToken(user.Id, user.Email, roles, permissions);
        var expiry = DateTime.UtcNow.AddMinutes(double.Parse(cfg["Jwt:ExpiryMinutes"] ?? "60"));

        user.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;

        var sessionId = Guid.NewGuid().ToString("N");
        var userAgent = Request.Headers.UserAgent.ToString();
        var session = new UserLoginSession
        {
            AppUserId = user.Id,
            SessionId = sessionId,
            IpAddress = ip,
            UserAgent = userAgent,
            DeviceId = "web-" + sessionId[..8],
            LoginAtUtc = DateTime.UtcNow,
            LastSeenAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = expiry,
            IsActive = true
        };
        db.UserLoginSessions.Add(session);

        db.AuditHistories.Add(new AuditHistory
        {
            ActionType = "Login", EntityName = "AppUser", EntityKey = user.Id.ToString(),
            AppUserId = user.Id, IpAddress = ip, CreatedAt = DateTime.UtcNow, IsActive = true
        });

        await db.SaveChangesAsync();

        return Ok(new LoginResponse(
            token,
            expiry,
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email, user.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.Tenant!.Name).FirstOrDefault(), roles, user.ProfilePhotoStorageKey)
        ));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var uidClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var jtiClaim = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;

        if (uidClaim is not null && long.TryParse(uidClaim, out var userId))
        {
            // C4: Blacklist the current JWT token
            if (!string.IsNullOrWhiteSpace(jtiClaim))
            {
                var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;
                var expiresAt = DateTime.UtcNow.AddMinutes(double.Parse(cfg["Jwt:ExpiryMinutes"] ?? "60"));
                if (long.TryParse(expClaim, out var expUnix))
                    expiresAt = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;

                db.TokenBlacklists.Add(new TokenBlacklist
                {
                    TokenJti = jtiClaim,
                    AppUserId = userId,
                    ExpiresAt = expiresAt,
                    Reason = "Logout",
                    IsActive = true
                });
            }

            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "Logout",
                EntityName = "AppUser",
                EntityKey = userId.ToString(),
                AppUserId = userId,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            });

            var activeSessions = await db.UserLoginSessions
                .Where(s => s.AppUserId == userId && s.IsActive).ToListAsync();
            foreach (var s in activeSessions)
            {
                s.IsActive = false;
                s.EndedAtUtc = DateTime.UtcNow;
                s.EndedReason = "Logout";
                s.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
        }
        return Ok(new { message = "Logged out." });
    }

    [Authorize(AuthenticationSchemes = "ApiKey")]
    [HttpPost("introspect")]
    public async Task<IActionResult> Introspect([FromBody] IntrospectRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { valid = false, message = "Token is required." });

        try
        {
            var jwtCfg = cfg.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtCfg["Key"]!));
            var handler = new JwtSecurityTokenHandler();
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtCfg["Issuer"],
                ValidAudience = jwtCfg["Audience"],
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.Zero
            };

            var principal = handler.ValidateToken(req.Token, validationParams, out var _);
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim is null || !long.TryParse(userIdClaim, out var userId))
                return Ok(new IntrospectResponse(false, null, null, null, req.RequiredPermission, false));

            var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value ?? "";
            var isBlacklisted = await db.TokenBlacklists.AnyAsync(t =>
                t.TokenJti == jti && t.IsActive);
            if (isBlacklisted)
                return Ok(new IntrospectResponse(false, null, null, null, req.RequiredPermission, false));

            var user = await db.AppUsers
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);

            if (user is null)
                return Ok(new IntrospectResponse(false, null, null, null, req.RequiredPermission, false));

            var permissions = user.UserRoles
                .Where(ur => ur.Role is not null)
                .SelectMany(ur => ur.Role!.RolePermissions)
                .Where(rp => rp.IsActive && rp.Permission is not null)
                .Select(rp => rp.Permission!.Code)
                .Distinct()
                .ToList();

            var directPerms = await db.UserPermissions
                .Where(up => up.AppUserId == userId && up.IsActive)
                .Select(up => up.Permission.Code)
                .Distinct()
                .ToListAsync();

            permissions.AddRange(directPerms);

            bool? hasPermission = null;
            if (!string.IsNullOrWhiteSpace(req.RequiredPermission))
                hasPermission = permissions.Contains(req.RequiredPermission);

            return Ok(new IntrospectResponse(true, userId, user.Email, permissions, req.RequiredPermission, hasPermission));
        }
        catch (SecurityTokenException)
        {
            return Ok(new IntrospectResponse(false, null, null, null, req.RequiredPermission, false));
        }
    }

    [Authorize(AuthenticationSchemes = "ApiKey")]
    [HttpPost("check-permission")]
    public async Task<IActionResult> CheckPermission([FromBody] CheckPermissionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.PermissionCode))
            return BadRequest(new { granted = false, message = "Token and permissionCode are required." });

        try
        {
            var jwtCfg = cfg.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtCfg["Key"]!));
            var handler = new JwtSecurityTokenHandler();
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtCfg["Issuer"],
                ValidAudience = jwtCfg["Audience"],
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.Zero
            };

            var principal = handler.ValidateToken(req.Token, validationParams, out var _);
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim is null || !long.TryParse(userIdClaim, out var userId))
                return Ok(new { granted = false });

            var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value ?? "";
            var isBlacklisted = await db.TokenBlacklists.AnyAsync(t =>
                t.TokenJti == jti && t.IsActive);
            if (isBlacklisted)
                return Ok(new { granted = false });

            var hasRolePermission = await db.UserRoles
                .Where(ur => ur.AppUserId == userId && ur.IsActive)
                .SelectMany(ur => ur.Role!.RolePermissions)
                .AnyAsync(rp => rp.IsActive && rp.Permission!.Code == req.PermissionCode);

            var hasDirectPermission = await db.UserPermissions
                .Where(up => up.AppUserId == userId && up.IsActive)
                .Select(up => up.Permission.Code)
                .AnyAsync(code => code == req.PermissionCode);

            return Ok(new { granted = hasRolePermission || hasDirectPermission });
        }
        catch (SecurityTokenException)
        {
            return Ok(new { granted = false });
        }
    }

    public record IntrospectRequest(string Token, string? RequiredPermission);
    public record IntrospectResponse(bool Valid, long? UserId, string? Email, List<string>? Permissions, string? RequiredPermission, bool? HasPermission);
    public record CheckPermissionRequest(string Token, string PermissionCode);

    private string BuildToken(long userId, string email, IEnumerable<string> roles, IEnumerable<string>? permissions = null)
    {
        var jwtCfg = cfg.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtCfg["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        if (permissions is not null)
            claims.AddRange(permissions.Select(p => new Claim("permission", p)));

        var token = new JwtSecurityToken(
            issuer: jwtCfg["Issuer"],
            audience: jwtCfg["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(jwtCfg["ExpiryMinutes"] ?? "60")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
