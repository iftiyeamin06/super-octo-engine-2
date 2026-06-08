using System.Security.Claims;
using System.Text.Json;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace CentralAuth.Api.Data;

public class CentralAuthDbContext(DbContextOptions<CentralAuthDbContext> options, IHttpContextAccessor httpContextAccessor) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<TenantUser> TenantUsers => Set<TenantUser>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Designation> Designations => Set<Designation>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RoleModule> RoleModules => Set<RoleModule>();
    public DbSet<RoleClaim> RoleClaims => Set<RoleClaim>();
    public DbSet<UserClaim> UserClaims => Set<UserClaim>();
    public DbSet<UserModuleAccess> UserModuleAccesses => Set<UserModuleAccess>();
    public DbSet<UserPageAccess> UserPageAccesses => Set<UserPageAccess>();
    public DbSet<UserLoginSession> UserLoginSessions => Set<UserLoginSession>();
    public DbSet<TokenBlacklist> TokenBlacklists => Set<TokenBlacklist>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServiceApiKey> ServiceApiKeys => Set<ServiceApiKey>();
    public DbSet<AuditHistory> AuditHistories => Set<AuditHistory>();
    public DbSet<UserDatatablePreference> UserDatatablePreferences => Set<UserDatatablePreference>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // Table name mappings (auth_ prefix)
        mb.Entity<Tenant>().ToTable("auth_tenants");
        mb.Entity<AppUser>().ToTable("auth_appusers");
        mb.Entity<TenantUser>().ToTable("auth_tenant_users");
        mb.Entity<Department>().ToTable("auth_departments");
        mb.Entity<Designation>().ToTable("auth_designations");
        mb.Entity<Role>().ToTable("auth_roles");
        mb.Entity<Permission>().ToTable("auth_permissions");
        mb.Entity<Module>().ToTable("auth_modules");
        mb.Entity<Page>().ToTable("auth_pages");
        mb.Entity<UserRole>().ToTable("auth_userroles");
        mb.Entity<RolePermission>().ToTable("auth_rolepermissions");
        mb.Entity<RoleModule>().ToTable("auth_rolemodules");
        mb.Entity<RoleClaim>().ToTable("auth_role_claims");
        mb.Entity<UserClaim>().ToTable("auth_user_claims");
        mb.Entity<UserModuleAccess>().ToTable("auth_usermoduleaccesses");
        mb.Entity<UserPageAccess>().ToTable("auth_userpageaccesses");
        mb.Entity<UserLoginSession>().ToTable("auth_user_login_sessions");
        mb.Entity<TokenBlacklist>().ToTable("auth_token_blacklist");
        mb.Entity<PasswordResetToken>().ToTable("auth_password_reset_tokens");
        mb.Entity<OtpVerification>().ToTable("auth_otp_verifications");
        mb.Entity<Service>().ToTable("auth_services");
        mb.Entity<ServiceApiKey>().ToTable("auth_service_api_keys");
        mb.Entity<AuditHistory>().ToTable("auth_audithistories");
        mb.Entity<UserDatatablePreference>().ToTable("auth_user_datatable_preferences");

        // Unique constraints
        mb.Entity<AppUser>().HasIndex(e => e.NormalizedEmail).IsUnique();
        mb.Entity<AppUser>().HasIndex(e => e.NormalizedUserName).IsUnique();
        mb.Entity<TenantUser>().HasIndex(tu => new { tu.TenantId, tu.EmployeeId }).IsUnique();
        mb.Entity<TenantUser>().HasIndex(tu => new { tu.AppUserId, tu.TenantId }).IsUnique();
        mb.Entity<Role>().HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        mb.Entity<Department>().HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        mb.Entity<Department>().HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        mb.Entity<Designation>().HasIndex(e => new { e.TenantId, e.Name }).IsUnique();
        mb.Entity<Permission>().HasIndex(e => e.Code).IsUnique();
        mb.Entity<Module>().HasIndex(e => e.Code).IsUnique();
        mb.Entity<UserRole>().HasIndex(e => new { e.AppUserId, e.RoleId }).IsUnique();
        mb.Entity<RolePermission>().HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
        mb.Entity<RoleModule>().HasIndex(e => new { e.RoleId, e.ModuleId }).IsUnique();
        mb.Entity<UserModuleAccess>().HasIndex(e => new { e.AppUserId, e.ModuleId }).IsUnique();
        mb.Entity<UserPageAccess>().HasIndex(e => new { e.AppUserId, e.PageId }).IsUnique();
        mb.Entity<UserLoginSession>().HasIndex(e => e.SessionId).IsUnique();
        mb.Entity<TokenBlacklist>().HasIndex(e => e.TokenJti).IsUnique();
        mb.Entity<PasswordResetToken>().HasIndex(e => e.TokenHash).IsUnique();
        mb.Entity<ServiceApiKey>().HasIndex(e => e.KeyHash).IsUnique();
        mb.Entity<Tenant>().HasIndex(e => e.Code).IsUnique();
        mb.Entity<Service>().HasIndex(e => e.Code).IsUnique();

        // Self-referential: Module.Parent
        mb.Entity<Module>().HasOne(e => e.Parent).WithMany(e => e.Children).HasForeignKey(e => e.ParentId).OnDelete(DeleteBehavior.Restrict);

        // TenantUser (many-to-many join) relationships
        mb.Entity<TenantUser>()
            .HasOne(tu => tu.AppUser)
            .WithMany(u => u.TenantUsers)
            .HasForeignKey(tu => tu.AppUserId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<TenantUser>()
            .HasOne(tu => tu.Tenant)
            .WithMany(t => t.TenantUsers)
            .HasForeignKey(tu => tu.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        // AppUser relationships
        mb.Entity<AppUser>().HasOne(e => e.Department).WithMany(e => e.Users).HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        mb.Entity<AppUser>().HasOne(e => e.Designation).WithMany(e => e.Users).HasForeignKey(e => e.DesignationId).OnDelete(DeleteBehavior.SetNull);

        // Junction tables
        mb.Entity<UserRole>().HasOne(e => e.AppUser).WithMany(e => e.UserRoles).HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserRole>().HasOne(e => e.Role).WithMany(e => e.UserRoles).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<RolePermission>().HasOne(e => e.Role).WithMany(e => e.RolePermissions).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<RolePermission>().HasOne(e => e.Permission).WithMany(e => e.RolePermissions).HasForeignKey(e => e.PermissionId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<RoleModule>().HasOne(e => e.Role).WithMany(e => e.RoleModules).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<RoleModule>().HasOne(e => e.Module).WithMany(e => e.RoleModules).HasForeignKey(e => e.ModuleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserModuleAccess>().HasOne(e => e.AppUser).WithMany(e => e.ModuleAccesses).HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserModuleAccess>().HasOne(e => e.Module).WithMany(e => e.UserModuleAccesses).HasForeignKey(e => e.ModuleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserPageAccess>().HasOne(e => e.AppUser).WithMany(e => e.PageAccesses).HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserPageAccess>().HasOne(e => e.Page).WithMany(e => e.UserPageAccesses).HasForeignKey(e => e.PageId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Page>().HasOne(e => e.Module).WithMany(e => e.Pages).HasForeignKey(e => e.ModuleId).OnDelete(DeleteBehavior.Cascade);

        // Claims
        mb.Entity<RoleClaim>().HasOne(e => e.Role).WithMany(e => e.Claims).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserClaim>().HasOne(e => e.AppUser).WithMany(e => e.Claims).HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);

        // Sessions & tokens
        mb.Entity<UserLoginSession>().HasOne(e => e.AppUser).WithMany(e => e.LoginSessions).HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<TokenBlacklist>().HasOne(e => e.AppUser).WithMany().HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.SetNull);
        mb.Entity<PasswordResetToken>().HasOne(e => e.AppUser).WithMany().HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<OtpVerification>().HasOne(e => e.AppUser).WithMany().HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<UserDatatablePreference>().HasOne(e => e.AppUser).WithMany().HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.Cascade);

        // Services
        mb.Entity<ServiceApiKey>().HasOne(e => e.Service).WithMany(e => e.ApiKeys).HasForeignKey(e => e.ServiceId).OnDelete(DeleteBehavior.Cascade);

        // Audit
        mb.Entity<AuditHistory>().HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.SetNull);
        mb.Entity<AuditHistory>().HasOne(e => e.AppUser).WithMany().HasForeignKey(e => e.AppUserId).OnDelete(DeleteBehavior.SetNull);
        mb.Entity<AuditHistory>().HasOne(e => e.Service).WithMany().HasForeignKey(e => e.ServiceId).OnDelete(DeleteBehavior.SetNull);

        // Tenant, Department, Designation relationships
        mb.Entity<Department>().HasOne(e => e.Tenant).WithMany(e => e.Departments).HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Designation>().HasOne(e => e.Tenant).WithMany(e => e.Designations).HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Role>().HasOne(e => e.Tenant).WithMany(e => e.Roles).HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
    }

    private static readonly HashSet<string> _excludedProps = new(StringComparer.Ordinal)
    {
        nameof(AppUser.PasswordHash), nameof(AppUser.NormalizedEmail), nameof(AppUser.NormalizedUserName),
        "ConcurrencyStamp", "Timestamp"
    };

    private static readonly HashSet<string> _excludedEntities = new(StringComparer.Ordinal)
    {
        nameof(UserLoginSession), nameof(TokenBlacklist), nameof(PasswordResetToken),
        nameof(OtpVerification), nameof(ServiceApiKey), nameof(AuditHistory),
        nameof(UserDatatablePreference)
    };

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count > 0)
        {
            var httpCtx = httpContextAccessor.HttpContext;
            var ip = httpCtx?.Connection.RemoteIpAddress?.ToString();
            var uidClaim = httpCtx?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            long? currentUserId = uidClaim is not null && long.TryParse(uidClaim, out var id) ? id : null;

            foreach (var entry in entries)
            {
                var entityName = entry.Entity.GetType().Name;
                if (_excludedEntities.Contains(entityName))
                    continue;

                var actionType = entry.State switch
                {
                    EntityState.Added => "Create",
                    EntityState.Deleted => "Delete",
                    EntityState.Modified when IsSoftDelete(entry) => "Delete",
                    EntityState.Modified when IsRestore(entry) => "Restore",
                    _ => "Update"
                };

                var oldVals = entry.State is EntityState.Modified or EntityState.Deleted
                    ? SerializeProps(entry.OriginalValues) : null;

                var newVals = entry.State is EntityState.Added or EntityState.Modified
                    ? SerializeProps(entry.CurrentValues) : null;

                var entityKey = entry.Property("Id").CurrentValue?.ToString() ?? "";

                var audit = new AuditHistory
                {
                    ActionType = actionType,
                    EntityName = entityName,
                    EntityKey = entityKey,
                    OldValues = oldVals,
                    NewValues = newVals,
                    IpAddress = ip,
                    AppUserId = currentUserId,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                var tid = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "TenantId");
                if (tid?.CurrentValue is long t)
                    audit.TenantId = t;

                AuditHistories.Add(audit);
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    private static bool IsSoftDelete(EntityEntry<BaseEntity> e)
    {
        var p = e.Property(nameof(BaseEntity.IsActive));
        return p.OriginalValue is true && p.CurrentValue is false;
    }

    private static bool IsRestore(EntityEntry<BaseEntity> e)
    {
        var p = e.Property(nameof(BaseEntity.IsActive));
        return p.OriginalValue is false && p.CurrentValue is true;
    }

    private static string? SerializeProps(PropertyValues values)
    {
        var dict = new Dictionary<string, object?>();
        foreach (var prop in values.Properties)
        {
            if (_excludedProps.Contains(prop.Name)) continue;
            dict[prop.Name] = values[prop];
        }
        return dict.Count > 0 ? JsonSerializer.Serialize(dict) : null;
    }
}
