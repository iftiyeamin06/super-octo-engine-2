namespace CentralAuth.Api.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string AccessToken,
    DateTime ExpiresAt,
    AuthUserDto User
);

public record AuthUserDto(
    long Id,
    string FullName,
    string Email,
    string? TenantName,
    IEnumerable<string> Roles
);

public record RefreshRequest(string RefreshToken);
