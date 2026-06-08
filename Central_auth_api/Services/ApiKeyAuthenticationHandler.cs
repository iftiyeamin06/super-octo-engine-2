using System.Security.Claims;
using System.Text.Encodings.Web;
using CentralAuth.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CentralAuth.Api.Services;

public class ApiKeyAuthenticationHandler(
    IOptionsMonitor<ApiKeyAuthOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IServiceScopeFactory scopeFactory)
    : AuthenticationHandler<ApiKeyAuthOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Api-Key", out var apiKeyValues))
            return AuthenticateResult.NoResult();

        var rawKey = apiKeyValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(rawKey))
            return AuthenticateResult.NoResult();

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CentralAuthDbContext>();

        var keys = await db.ServiceApiKeys
            .Include(k => k.Service)
            .Where(k => k.IsActive && (k.ExpiresAt == null || k.ExpiresAt > DateTime.UtcNow))
            .ToListAsync();

        var matched = keys.FirstOrDefault(k => BCrypt.Net.BCrypt.Verify(rawKey, k.KeyHash));
        if (matched is null)
            return AuthenticateResult.Fail("Invalid or expired API key.");

        matched.LastUsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, matched.ServiceId.ToString()),
            new Claim(ClaimTypes.Name, matched.Service.Code),
            new Claim("service_id", matched.ServiceId.ToString()),
            new Claim("service_code", matched.Service.Code),
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}

public class ApiKeyAuthOptions : AuthenticationSchemeOptions { }
