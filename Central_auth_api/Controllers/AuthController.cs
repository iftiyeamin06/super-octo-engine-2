using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using CentralAuth.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(CentralAuthDbContext db, IConfiguration cfg, IOtpService otpService, IEmailService emailService, ITokenService tokenService) : ControllerBase
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

        var token = BuildToken(user.Id, user.Email, roles, permissions, user.IsEmailVerified);
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
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email, user.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.Tenant!.Name).FirstOrDefault(), roles, user.ProfilePhotoStorageKey, user.IsEmailVerified)
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

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("send-email-verification")]
    public async Task<IActionResult> SendEmailVerification([FromBody] SendVerificationRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return Ok(new { message = "If an account exists, a verification code has been sent." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is not null && !user.IsEmailVerified)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            try
            {
                var otp = await otpService.GenerateAndStoreAsync(user.Id, "EmailVerification", user.Email, ip);
                var token = await tokenService.GenerateTokenAsync(user.Id, "EmailVerification", TimeSpan.FromHours(24), ip);
                var frontendUrl = cfg["Frontend:BaseUrl"] ?? "http://localhost:5173";
                var verifyLink = $"{frontendUrl}/verify-email?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email)}";
                var html = EmailTemplates.GetVerificationEmail(user.FirstName, otp, verifyLink);
                await emailService.SendAsync(user.Email, "Verify your email address", html);

                db.AuditHistories.Add(new AuditHistory
                {
                    ActionType = "EmailVerificationRequested", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                    AppUserId = user.Id, IpAddress = ip,
                    NewValues = JsonSerializer.Serialize(new { email = user.Email, method = "otp" }),
                    CreatedAt = DateTime.UtcNow, IsActive = true
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailVerification] Error: {ex.Message}");
            }
        }

        return Ok(new { message = "If an account exists, a verification code has been sent." });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("send-verification-link")]
    public async Task<IActionResult> SendVerificationLink([FromBody] SendVerificationLinkRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return Ok(new { message = "If an account exists, a verification link has been sent." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is not null && !user.IsEmailVerified)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            try
            {
                var otp = await otpService.GenerateAndStoreAsync(user.Id, "EmailVerification", user.Email, ip);
                var token = await tokenService.GenerateTokenAsync(user.Id, "EmailVerification", TimeSpan.FromHours(24), ip);
                var frontendUrl = cfg["Frontend:BaseUrl"] ?? "http://localhost:5173";
                var verifyLink = $"{frontendUrl}/verify-email?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email)}";
                var html = EmailTemplates.GetVerificationEmail(user.FirstName, otp, verifyLink);
                await emailService.SendAsync(user.Email, "Verify your email address", html);

                db.AuditHistories.Add(new AuditHistory
                {
                    ActionType = "EmailVerificationRequested", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                    AppUserId = user.Id, IpAddress = ip,
                    NewValues = JsonSerializer.Serialize(new { email = user.Email, method = "magic_link" }),
                    CreatedAt = DateTime.UtcNow, IsActive = true
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendVerificationLink] Error: {ex.Message}");
            }
        }

        return Ok(new { message = "If an account exists, a verification link has been sent." });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpGet("verify-email-link")]
    public async Task<IActionResult> VerifyEmailLink([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Invalid verification link." });

        var userId = await tokenService.ValidateTokenAsync(token, "EmailVerification");
        if (userId is null)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "EmailVerificationFailed", EntityName = "AppUser", EntityKey = "",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                NewValues = JsonSerializer.Serialize(new { method = "magic_link", reason = "invalid_token" }),
                CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return BadRequest(new { message = "Invalid or expired verification link." });
        }

        var user = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == userId.Value && u.IsActive);

        if (user is null)
            return BadRequest(new { message = "Invalid or expired verification link." });

        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;

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

        var jwtToken = BuildToken(user.Id, user.Email, roles, permissions, true);
        var expiry = DateTime.UtcNow.AddMinutes(double.Parse(cfg["Jwt:ExpiryMinutes"] ?? "60"));

        db.AuditHistories.Add(new AuditHistory
        {
            ActionType = "EmailVerified", EntityName = "AppUser", EntityKey = user.Id.ToString(),
            AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            NewValues = JsonSerializer.Serialize(new { method = "magic_link" }),
            CreatedAt = DateTime.UtcNow, IsActive = true
        });

        await db.SaveChangesAsync();

        return Ok(new LoginResponse(
            jwtToken,
            expiry,
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email,
                user.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.Tenant!.Name).FirstOrDefault(),
                roles, user.ProfilePhotoStorageKey, true)
        ));
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Otp))
            return BadRequest(new { message = "Invalid email or verification code." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is null)
            return BadRequest(new { message = "Invalid email or verification code." });

        var verified = await otpService.VerifyAsync(user.Id, "EmailVerification", req.Otp);
        if (!verified)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "EmailVerificationFailed", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                NewValues = JsonSerializer.Serialize(new { method = "otp", reason = "invalid_otp" }),
                CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return BadRequest(new { message = "Invalid email or verification code." });
        }

        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;

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

        var token = BuildToken(user.Id, user.Email, roles, permissions, true);
        var expiry = DateTime.UtcNow.AddMinutes(double.Parse(cfg["Jwt:ExpiryMinutes"] ?? "60"));

        db.AuditHistories.Add(new AuditHistory
        {
            ActionType = "EmailVerified", EntityName = "AppUser", EntityKey = user.Id.ToString(),
            AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            NewValues = JsonSerializer.Serialize(new { method = "otp" }),
            CreatedAt = DateTime.UtcNow, IsActive = true
        });

        await db.SaveChangesAsync();

        return Ok(new LoginResponse(
            token,
            expiry,
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email,
                user.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.Tenant!.Name).FirstOrDefault(),
                roles, user.ProfilePhotoStorageKey, true)
        ));
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return Ok(new { message = "If an account exists, a reset code has been sent." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is not null)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            try
            {
                var isMagicLink = string.Equals(req.Method, "magic-link", StringComparison.OrdinalIgnoreCase);
                var frontendUrl = cfg["Frontend:BaseUrl"] ?? "http://localhost:5173";
                string html;

                if (isMagicLink)
                {
                    var token = await tokenService.GenerateTokenAsync(user.Id, "PasswordReset", TimeSpan.FromHours(24), ip);
                    var resetLink = $"{frontendUrl}/forgot-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email)}";
                    html = EmailTemplates.GetMagicLinkEmail(user.FirstName, resetLink);
                }
                else
                {
                    var otp = await otpService.GenerateAndStoreAsync(user.Id, "PasswordReset", user.Email, ip);
                    html = EmailTemplates.GetOtpOnlyEmail(user.FirstName, otp);
                }

                await emailService.SendAsync(user.Email, "Reset your password", html);

                db.AuditHistories.Add(new AuditHistory
                {
                    ActionType = "ForgotPassword", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                    AppUserId = user.Id, IpAddress = ip,
                    NewValues = JsonSerializer.Serialize(new { email = user.Email, method = isMagicLink ? "magic-link" : "otp" }),
                    CreatedAt = DateTime.UtcNow, IsActive = true
                });
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ForgotPassword] Error: {ex.Message}");
            }
        }

        return Ok(new { message = "If an account exists, a reset code has been sent." });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("verify-reset-otp")]
    public async Task<IActionResult> VerifyResetOtp([FromBody] VerifyResetOtpRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Otp))
            return BadRequest(new { message = "Invalid email or verification code." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is null)
            return BadRequest(new { message = "Invalid email or verification code." });

        var verified = await otpService.VerifyAsync(user.Id, "PasswordReset", req.Otp);
        if (!verified)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "PasswordResetFailed", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                NewValues = JsonSerializer.Serialize(new { method = "otp", reason = "invalid_otp" }),
                CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return BadRequest(new { message = "Invalid email or verification code." });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var resetToken = await tokenService.GenerateTokenAsync(user.Id, "PasswordReset", TimeSpan.FromMinutes(10), ip);

        return Ok(new VerifyResetOtpResponse(resetToken));
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Otp) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Invalid email or verification code." });

        var normalized = req.Email.ToUpperInvariant();
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is null)
            return BadRequest(new { message = "Invalid email or verification code." });

        var verified = await otpService.VerifyAsync(user.Id, "PasswordReset", req.Otp);
        if (!verified)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "PasswordResetFailed", EntityName = "AppUser", EntityKey = user.Id.ToString(),
                AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                NewValues = JsonSerializer.Serialize(new { method = "otp", reason = "invalid_otp" }),
                CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return BadRequest(new { message = "Invalid email or verification code." });
        }

        var validationError = ValidatePassword(req.NewPassword);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 12);
        user.UpdatedAt = DateTime.UtcNow;

        var activeSessions = await db.UserLoginSessions
            .Where(s => s.AppUserId == user.Id && s.IsActive).ToListAsync();
        foreach (var s in activeSessions)
        {
            s.IsActive = false;
            s.EndedAtUtc = DateTime.UtcNow;
            s.EndedReason = "PasswordReset";
            s.UpdatedAt = DateTime.UtcNow;
        }

        db.AuditHistories.Add(new AuditHistory
        {
            ActionType = "PasswordReset", EntityName = "AppUser", EntityKey = user.Id.ToString(),
            AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            NewValues = JsonSerializer.Serialize(new { method = "otp" }),
            CreatedAt = DateTime.UtcNow, IsActive = true
        });

        await db.SaveChangesAsync();
        return Ok(new { message = "Password has been reset successfully." });
    }

    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("reset-password-link")]
    public async Task<IActionResult> ResetPasswordLink([FromBody] ResetPasswordLinkRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Invalid or expired reset link." });

        var userId = await tokenService.ValidateTokenAsync(req.Token, "PasswordReset");
        if (userId is null)
        {
            db.AuditHistories.Add(new AuditHistory
            {
                ActionType = "PasswordResetFailed", EntityName = "AppUser", EntityKey = "",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                NewValues = JsonSerializer.Serialize(new { method = "magic_link", reason = "invalid_token" }),
                CreatedAt = DateTime.UtcNow, IsActive = true
            });
            await db.SaveChangesAsync();
            return BadRequest(new { message = "Invalid or expired reset link." });
        }

        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Id == userId.Value && u.IsActive);
        if (user is null)
            return BadRequest(new { message = "Invalid or expired reset link." });

        var validationError = ValidatePassword(req.NewPassword);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 12);
        user.UpdatedAt = DateTime.UtcNow;

        var activeSessions = await db.UserLoginSessions
            .Where(s => s.AppUserId == user.Id && s.IsActive).ToListAsync();
        foreach (var s in activeSessions)
        {
            s.IsActive = false;
            s.EndedAtUtc = DateTime.UtcNow;
            s.EndedReason = "PasswordReset";
            s.UpdatedAt = DateTime.UtcNow;
        }

        db.AuditHistories.Add(new AuditHistory
        {
            ActionType = "PasswordReset", EntityName = "AppUser", EntityKey = user.Id.ToString(),
            AppUserId = user.Id, IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            NewValues = JsonSerializer.Serialize(new { method = "magic_link" }),
            CreatedAt = DateTime.UtcNow, IsActive = true
        });

        await db.SaveChangesAsync();
        return Ok(new { message = "Password has been reset successfully." });
    }

    private string? ValidatePassword(string password)
    {
        if (password.Length < 8) return "Password must be at least 8 characters.";
        if (password.Length > 128) return "Password must not exceed 128 characters.";
        int classes = 0;
        if (password.Any(char.IsUpper)) classes++;
        if (password.Any(char.IsLower)) classes++;
        if (password.Any(char.IsDigit)) classes++;
        if (password.Any(c => !char.IsLetterOrDigit(c))) classes++;
        if (classes < 3) return "Password must include at least 3 of: uppercase, lowercase, digit, special character.";
        return null;
    }

    private string BuildToken(long userId, string email, IEnumerable<string> roles, IEnumerable<string>? permissions = null, bool emailVerified = true)
    {
        var jwtCfg = cfg.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtCfg["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("email_verified", emailVerified.ToString().ToLowerInvariant()),
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
