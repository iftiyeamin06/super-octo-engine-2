namespace CentralAuth.Api.Models;

public class Service : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BaseUrl { get; set; }

    public ICollection<ServiceApiKey> ApiKeys { get; set; } = [];
    public ICollection<ApiServiceRoute> ApiServiceRoutes { get; set; } = [];
}
