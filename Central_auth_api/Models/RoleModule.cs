namespace CentralAuth.Api.Models;

public class RoleModule : BaseEntity
{
    public long RoleId { get; set; }
    public long ModuleId { get; set; }

    public Role Role { get; set; } = null!;
    public Module Module { get; set; } = null!;
}
