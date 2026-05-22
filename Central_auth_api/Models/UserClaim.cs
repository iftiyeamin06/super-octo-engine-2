namespace CentralAuth.Api.Models;

public class UserClaim : BaseEntity
{
    public long AppUserId { get; set; }
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;

    public AppUser AppUser { get; set; } = null!;
}
