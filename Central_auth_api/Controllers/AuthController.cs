using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
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
            .Include(u => u.Tenant)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalized && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (user.IsLocked)
            return Unauthorized(new { message = "Account is locked. Contact your administrator." });

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        await db.SaveChangesAsync();

        var roles = user.UserRoles.Where(ur => ur.Role is not null).Select(ur => ur.Role!.Name).ToList();
        var token = BuildToken(user.Id, user.Email, roles);
        var expiry = DateTime.UtcNow.AddMinutes(double.Parse(cfg["Jwt:ExpiryMinutes"] ?? "60"));

        return Ok(new LoginResponse(
            token,
            expiry,
            new AuthUserDto(user.Id, $"{user.FirstName} {user.LastName}".Trim(), user.Email, user.Tenant?.Name, roles)
        ));
    }

    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { message = "Logged out." });

    // Dev utility — remove before production
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

    private string BuildToken(long userId, string email, IEnumerable<string> roles)
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
