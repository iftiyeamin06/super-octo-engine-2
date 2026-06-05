namespace CentralAuth.Api.Models;

public class TenantUser : BaseEntity
{
    public long AppUserId { get; set; }
    public long TenantId { get; set; }
    public string? EmployeeId { get; set; }

    public virtual AppUser? AppUser { get; set; }
    public virtual Tenant? Tenant { get; set; }
}
