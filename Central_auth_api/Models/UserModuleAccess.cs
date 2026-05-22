namespace CentralAuth.Api.Models;

public class UserModuleAccess : BaseEntity
{
    public long AppUserId { get; set; }
    public long ModuleId { get; set; }

    public AppUser AppUser { get; set; } = null!;
    public Module Module { get; set; } = null!;
}
