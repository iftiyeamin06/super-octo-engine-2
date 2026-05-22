namespace CentralAuth.Api.Models;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? LogoUrl { get; set; }
    public string? SubscriptionPlan { get; set; }
    public DateTime? SubscriptionExpiresAt { get; set; }

    public ICollection<AppUser> Users { get; set; } = [];
    public ICollection<Department> Departments { get; set; } = [];
    public ICollection<Designation> Designations { get; set; } = [];
    public ICollection<Role> Roles { get; set; } = [];
}
