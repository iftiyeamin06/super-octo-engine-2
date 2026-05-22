namespace CentralAuth.Api.Models;

public class ServiceApiKey : BaseEntity
{
    public long ServiceId { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    public Service Service { get; set; } = null!;
}
