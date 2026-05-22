namespace CentralAuth.Api.Models;

public class Page : BaseEntity
{
    public long ModuleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string? Icon { get; set; }

    public Module Module { get; set; } = null!;
    public ICollection<UserPageAccess> UserPageAccesses { get; set; } = [];
}
