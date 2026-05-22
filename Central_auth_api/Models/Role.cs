namespace CentralAuth.Api.Models;

public class Role : BaseEntity
{
    public long? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
    public ICollection<RoleModule> RoleModules { get; set; } = [];
    public ICollection<RoleClaim> Claims { get; set; } = [];
}
