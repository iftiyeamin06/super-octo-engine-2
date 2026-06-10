namespace CentralAuth.Api.Models;

public class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public string? GroupName { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = [];
    public ICollection<ModulePermission> ModulePermissions { get; set; } = [];
}
