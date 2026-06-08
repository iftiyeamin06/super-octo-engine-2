namespace CentralAuth.Api.Models;

public class ApiServiceRoute : BaseEntity
{
    public long? ServiceId { get; set; }
    public string HttpMethod { get; set; } = string.Empty;
    public string RoutePattern { get; set; } = string.Empty;
    public string RequiredPermissionCode { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Service? Service { get; set; }
}
