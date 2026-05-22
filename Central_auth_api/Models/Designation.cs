namespace CentralAuth.Api.Models;

public class Designation : BaseEntity
{
    public long? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<AppUser> Users { get; set; } = [];
}
