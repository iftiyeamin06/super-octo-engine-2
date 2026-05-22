namespace CentralAuth.Api.Models;

public class UserRole : BaseEntity
{
    public long AppUserId { get; set; }
    public long RoleId { get; set; }

    public AppUser AppUser { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
