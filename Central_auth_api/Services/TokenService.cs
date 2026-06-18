using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Services;

public interface ITokenService
{
    Task<string> GenerateTokenAsync(long userId, string purpose, TimeSpan expiry, string? ip);
    Task<long?> ValidateTokenAsync(string token, string purpose);
    Task CleanExpiredTokensAsync();
}

public class TokenService(CentralAuthDbContext db) : ITokenService
{
    public async Task<string> GenerateTokenAsync(long userId, string purpose, TimeSpan expiry, string? ip)
    {
        var rawToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        var record = new EmailVerificationToken
        {
            UserId = userId,
            Token = rawToken,
            Purpose = purpose,
            ExpiresAt = DateTime.UtcNow.Add(expiry),
            IsUsed = false,
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow
        };

        db.EmailVerificationTokens.Add(record);
        await db.SaveChangesAsync();

        return rawToken;
    }

    public async Task<long?> ValidateTokenAsync(string token, string purpose)
    {
        var record = await db.EmailVerificationTokens
            .Where(t => t.Token == token && t.Purpose == purpose)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (record is null) return null;
        if (record.IsUsed) return null;
        if (record.ExpiresAt < DateTime.UtcNow) return null;

        record.IsUsed = true;
        record.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return record.UserId;
    }

    public async Task CleanExpiredTokensAsync()
    {
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var expired = await db.EmailVerificationTokens
            .Where(t => t.CreatedAt < cutoff)
            .ToListAsync();

        if (expired.Count > 0)
        {
            db.EmailVerificationTokens.RemoveRange(expired);
            await db.SaveChangesAsync();
        }
    }
}
