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
    IEnumerable<string> Roles,
    string? ProfilePhotoStorageKey,
    bool IsEmailVerified
);

public record RefreshRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Otp, string NewPassword);
public record SendVerificationRequest(string Email);
public record VerifyEmailRequest(string Email, string Otp);
