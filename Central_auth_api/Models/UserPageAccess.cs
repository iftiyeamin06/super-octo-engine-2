namespace CentralAuth.Api.Models;

public class UserPageAccess : BaseEntity
{
    public long AppUserId { get; set; }
    public long PageId { get; set; }

    public AppUser AppUser { get; set; } = null!;
    public Page Page { get; set; } = null!;
}
