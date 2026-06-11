namespace CentralAuth.Api.Models;

public class UserApiRoute : BaseEntity
{
    public long AppUserId { get; set; }
    public long ApiServiceRouteId { get; set; }

    public AppUser AppUser { get; set; } = null!;
    public ApiServiceRoute ApiServiceRoute { get; set; } = null!;
}
