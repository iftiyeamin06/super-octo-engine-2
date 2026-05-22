namespace CentralAuth.Api.Models;

public class AppUser : BaseEntity
{
    public long? TenantId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string NormalizedUserName { get; set; } = string.Empty;
    public string? ProfilePhotoStorageKey { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public long? DepartmentId { get; set; }
    public long? DesignationId { get; set; }
    public bool IsLocked { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorMethod { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public Tenant? Tenant { get; set; }
    public Department? Department { get; set; }
    public Designation? Designation { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<UserLoginSession> LoginSessions { get; set; } = [];
    public ICollection<UserClaim> Claims { get; set; } = [];
    public ICollection<UserModuleAccess> ModuleAccesses { get; set; } = [];
    public ICollection<UserPageAccess> PageAccesses { get; set; } = [];
}
