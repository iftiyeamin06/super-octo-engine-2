namespace CentralAuth.Api.Models;

public class ModulePermission : BaseEntity
{
    public long ModuleId { get; set; }
    public long PermissionId { get; set; }

    public Module Module { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
