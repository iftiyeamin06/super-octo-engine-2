namespace CentralAuth.Api.Models;

public class UserPermission : BaseEntity
{
    public long AppUserId { get; set; }
    public long PermissionId { get; set; }

    public AppUser AppUser { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
