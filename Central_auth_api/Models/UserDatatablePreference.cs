namespace CentralAuth.Api.Models;

public class UserDatatablePreference
{
    public long Id { get; set; }
    public long AppUserId { get; set; }
    public string PreferenceKey { get; set; } = string.Empty;
    public string StateJson { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AppUser AppUser { get; set; } = null!;
}
