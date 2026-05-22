namespace CentralAuth.Api.Models;

public class Module : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public long? ParentId { get; set; }
    public int SortOrder { get; set; }
    public string? Icon { get; set; }
    public string Route { get; set; } = string.Empty;

    public Module? Parent { get; set; }
    public ICollection<Module> Children { get; set; } = [];
    public ICollection<Page> Pages { get; set; } = [];
    public ICollection<RoleModule> RoleModules { get; set; } = [];
    public ICollection<UserModuleAccess> UserModuleAccesses { get; set; } = [];
}
