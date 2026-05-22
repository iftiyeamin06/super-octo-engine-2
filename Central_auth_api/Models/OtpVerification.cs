namespace CentralAuth.Api.Models;

public class OtpVerification
{
    public long Id { get; set; }
    public long AppUserId { get; set; }
    public string OtpHash { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string DeliveryMethod { get; set; } = string.Empty;
    public string DeliveredTo { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public int FailedAttempts { get; set; }
    public string? IpAddress { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser AppUser { get; set; } = null!;
}
