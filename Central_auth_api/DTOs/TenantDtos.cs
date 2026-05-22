namespace CentralAuth.Api.DTOs;

public record TenantListDto(
    long Id, string Name, string Code, string? Description,
    string? ContactEmail, string? LogoUrl, string? SubscriptionPlan,
    DateTime? SubscriptionExpiresAt, bool IsActive, DateTime CreatedAt,
    int UserCount);

public record TenantCreateDto(string Name, string Code, string? Description, string? ContactEmail, string? LogoUrl, string? SubscriptionPlan, DateTime? SubscriptionExpiresAt);
public record TenantUpdateDto(string Name, string? Description, string? ContactEmail, string? LogoUrl, string? SubscriptionPlan, DateTime? SubscriptionExpiresAt, bool IsActive);
