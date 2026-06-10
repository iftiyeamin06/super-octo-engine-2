namespace CentralAuth.Api.Models;

public class AuditHistory
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public long? AppUserId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string EntityKey { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public string? DeviceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public Tenant? Tenant { get; set; }
    public AppUser? AppUser { get; set; }
}
