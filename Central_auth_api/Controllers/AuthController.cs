using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(CentralAuthDbContext db, IConfiguration cfg) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        var audit = new AuditHistory
        {
            ActionType = "Login",
            EntityName = "AppUser",
            EntityKey = user?.Id.ToString() ?? "",
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            audit.ActionType = "Login Failed";
            db.AuditHistories.Add(audit);
            await db.SaveChangesAsync();
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.IsLocked)
        {
            audit.ActionType = "Login Failed";
            audit.AppUserId = user.Id;
            db.AuditHistories.Add(audit);
            await db.SaveChangesAsync();
            return Unauthorized(new { message = "Account is locked. Contact your administrator." });
        }

        audit.AppUserId = user.Id;
        db.AuditHistories.Add(audit);

        user.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        await db.SaveChangesAsync();

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

        return Ok(new LoginResponse(
            token,
            expiry,
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email, user.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.Tenant!.Name).FirstOrDefault(), roles)
        ));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var uidClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (uidClaim is not null && long.TryParse(uidClaim, out var userId))
        {
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
            await db.SaveChangesAsync();
        }
        return Ok(new { message = "Logged out." });
    }

#if DEBUG
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest req)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == req.Email.ToUpperInvariant());
        if (user is null) return NotFound();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Password updated." });
    }

    public record SetPasswordRequest(string Email, string NewPassword);
#endif

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
