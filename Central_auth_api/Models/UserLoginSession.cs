namespace CentralAuth.Api.Models;

public class UserLoginSession : BaseEntity
{
    public long AppUserId { get; set; }
    public string SessionId { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public DateTime? RefreshTokenRevokedAt { get; set; }
    public string? DeviceId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime LoginAtUtc { get; set; }
    public DateTime LastSeenAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public string? EndedReason { get; set; }
    public DateTime? CloseRequestedAtUtc { get; set; }

    public AppUser AppUser { get; set; } = null!;
}
