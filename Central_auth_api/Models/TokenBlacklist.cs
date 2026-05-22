namespace CentralAuth.Api.Models;

public class TokenBlacklist
{
    public long Id { get; set; }
    public string TokenJti { get; set; } = string.Empty;
    public long? AppUserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime RevokedAt { get; set; } = DateTime.UtcNow;
    public string? Reason { get; set; }
    public bool IsActive { get; set; } = true;

    public AppUser? AppUser { get; set; }
}
