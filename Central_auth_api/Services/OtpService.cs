using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Services;

public interface IOtpService
{
    Task<string> GenerateAndStoreAsync(long userId, string purpose, string deliveredTo, string? ip);
    Task<bool> VerifyAsync(long userId, string purpose, string otpCode);
    Task<bool> CanSendAsync(long userId, string purpose);
}

public class OtpService(CentralAuthDbContext db) : IOtpService
{
    private const int ExpiryMinutes = 10;
    private const int MaxFailedAttempts = 3;
    private const int RateLimitSeconds = 60;
    private const int BcryptWorkFactor = 6;

    public async Task<string> GenerateAndStoreAsync(long userId, string purpose, string deliveredTo, string? ip)
    {
        if (!await CanSendAsync(userId, purpose))
            throw new InvalidOperationException("Please wait before requesting another code.");

        var previous = await db.OtpVerifications
            .Where(o => o.AppUserId == userId && o.Purpose == purpose && o.VerifiedAt == null)
            .ToListAsync();
        foreach (var old in previous)
            old.FailedAttempts = MaxFailedAttempts;

        var rawOtp = Random.Shared.Next(100000, 999999).ToString();
        var otpHash = BCrypt.Net.BCrypt.HashPassword(rawOtp, workFactor: BcryptWorkFactor);

        var record = new OtpVerification
        {
            AppUserId = userId,
            OtpHash = otpHash,
            Purpose = purpose,
            DeliveryMethod = "email",
            DeliveredTo = deliveredTo,
            ExpiresAt = DateTime.UtcNow.AddMinutes(ExpiryMinutes),
            FailedAttempts = 0,
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow
        };

        db.OtpVerifications.Add(record);
        await db.SaveChangesAsync();

        return rawOtp;
    }

    public async Task<bool> VerifyAsync(long userId, string purpose, string otpCode)
    {
        var otp = await db.OtpVerifications
            .Where(o => o.AppUserId == userId && o.Purpose == purpose)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp is null) return false;
        if (otp.VerifiedAt != null) return false;
        if (otp.FailedAttempts >= MaxFailedAttempts) return false;
        if (otp.ExpiresAt < DateTime.UtcNow) return false;

        if (!BCrypt.Net.BCrypt.Verify(otpCode, otp.OtpHash))
        {
            otp.FailedAttempts++;
            await db.SaveChangesAsync();
            return false;
        }

        otp.VerifiedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CanSendAsync(long userId, string purpose)
    {
        var latest = await db.OtpVerifications
            .Where(o => o.AppUserId == userId && o.Purpose == purpose)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (latest is null) return true;
        return (DateTime.UtcNow - latest.CreatedAt).TotalSeconds >= RateLimitSeconds;
    }
}
