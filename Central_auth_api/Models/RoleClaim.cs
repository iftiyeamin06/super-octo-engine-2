namespace CentralAuth.Api.Models;

public class RoleClaim : BaseEntity
{
    public long RoleId { get; set; }
    public string ClaimType { get; set; } = string.Empty;
    public string ClaimValue { get; set; } = string.Empty;

    public Role Role { get; set; } = null!;
}
