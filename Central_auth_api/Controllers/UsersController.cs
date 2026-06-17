using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using CentralAuth.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(CentralAuthDbContext db, IEmployeeIdGenerator employeeIdGenerator) : ControllerBase
{
    [HttpGet("me/modules")]
    public async Task<IActionResult> GetMyModules()
    {
        var uidClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (uidClaim is null || !long.TryParse(uidClaim, out var userId))
            return Unauthorized(new { message = "Authentication required." });

        var userPermissionIds = await db.UserRoles
            .Where(ur => ur.AppUserId == userId && ur.IsActive && ur.Role != null)
            .SelectMany(ur => ur.Role!.RolePermissions)
            .Where(rp => rp.IsActive)
            .Select(rp => rp.PermissionId)
            .Distinct()
            .ToListAsync();

        var directPermissionIds = await db.UserPermissions
            .Where(up => up.AppUserId == userId)
            .Select(up => up.PermissionId)
            .ToListAsync();

        var allPermissionIds = userPermissionIds.Union(directPermissionIds).Distinct().ToList();

        var permModuleIds = await db.ModulePermissions
            .Where(mp => allPermissionIds.Contains(mp.PermissionId))
            .Select(mp => mp.ModuleId)
            .Distinct()
            .ToListAsync();

        var explicitModuleIds = await db.UserModuleAccesses
            .Where(uma => uma.AppUserId == userId && uma.IsActive)
            .Select(uma => uma.ModuleId)
            .ToListAsync();

        var routeModuleIds = await db.UserApiRoutes
            .Where(ur => ur.AppUserId == userId && ur.IsActive)
            .Select(ur => ur.ApiServiceRoute.ModuleId)
            .Distinct()
            .ToListAsync();

        var allModuleIds = permModuleIds.Union(explicitModuleIds).Union(routeModuleIds).Distinct().ToList();

        var modules = await db.Modules
            .Where(m => allModuleIds.Contains(m.Id) && m.IsActive)
            .OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .Select(m => new
            {
                m.Id, m.Name, m.Code, m.Route, m.Icon, m.SortOrder,
                m.ParentId, m.IsActive
            })
            .ToListAsync();

        return Ok(modules);
    }

    [HttpGet]
    public async Task<PagedResult<UserListDto>> GetAll(
        [FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] long? tenantId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.Department)
            .Include(u => u.Designation)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.FirstName.Contains(search) || u.LastName.Contains(search) || u.Email.Contains(search));

        if (tenantId.HasValue) q = q.Where(u => u.TenantUsers.Any(tu => tu.TenantId == tenantId));

        q = status switch
        {
            "active"   => q.Where(u => u.IsActive),
            "inactive" => q.Where(u => !u.IsActive),
            "locked"   => q.Where(u => u.IsLocked),
            _          => q
        };

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new UserListDto(
                u.Id, u.FirstName, u.LastName, u.Email, u.UserName,
                u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.EmployeeId).FirstOrDefault(),
                u.ProfilePhotoStorageKey, u.IsActive, u.IsLocked, u.TwoFactorEnabled,
                u.FailedLoginAttempts, u.LastLoginAt, u.CreatedAt,
                u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.TenantId).FirstOrDefault(),
                u.TenantUsers.Where(tu => tu.IsActive && tu.Tenant != null).Select(tu => tu.Tenant!.Name).FirstOrDefault(),
                u.DepartmentId, u.Department != null ? u.Department.Name : null,
                u.DesignationId, u.Designation != null ? u.Designation.Name : null,
                u.UserRoles.Where(ur => ur.IsActive && ur.Role != null).Select(ur => ur.Role!.Name).ToList()))
            .ToListAsync();

        return new PagedResult<UserListDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserListDto>> GetById(long id)
    {
        var u = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.Department).Include(u => u.Designation)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (u is null) return NotFound();

        return new UserListDto(u.Id, u.FirstName, u.LastName, u.Email, u.UserName,
            u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.EmployeeId).FirstOrDefault(),
            u.ProfilePhotoStorageKey, u.IsActive, u.IsLocked, u.TwoFactorEnabled,
            u.FailedLoginAttempts, u.LastLoginAt, u.CreatedAt,
            u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.TenantId).FirstOrDefault(),
            u.TenantUsers.Where(tu => tu.IsActive && tu.Tenant != null).Select(tu => tu.Tenant!.Name).FirstOrDefault(),
            u.DepartmentId, u.Department?.Name,
            u.DesignationId, u.Designation?.Name,
            u.UserRoles.Where(ur => ur.IsActive && ur.Role != null).Select(ur => ur.Role!.Name).ToList());
    }

    [HttpGet("{id:long}/profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile(long id)
    {
        var u = await db.AppUsers
            .Include(u => u.TenantUsers).ThenInclude(tu => tu.Tenant)
            .Include(u => u.Department)
            .Include(u => u.Designation)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r!.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(u => u.UserPermissions).ThenInclude(up => up.Permission)
            .Include(u => u.ModuleAccesses).ThenInclude(uma => uma.Module)
            .Include(u => u.UserApiRoutes).ThenInclude(ur => ur.ApiServiceRoute)
            .Include(u => u.LoginSessions)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (u is null) return NotFound();

        // Combine role permissions + direct permissions, deduplicate
        var rolePerms = u.UserRoles
            .Where(ur => ur.IsActive && ur.Role != null)
            .SelectMany(ur => ur.Role!.RolePermissions)
            .Where(rp => rp.IsActive && rp.Permission != null)
            .Select(rp => rp.Permission!);

        var directPerms = u.UserPermissions
            .Where(up => up.IsActive && up.Permission != null)
            .Select(up => up.Permission!);

        var allPerms = rolePerms.Concat(directPerms)
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .OrderBy(p => p.GroupName).ThenBy(p => p.Code)
            .Select(p => new PermissionSummaryDto(p.Id, p.Code, p.Name, p.GroupName))
            .ToList();

        var sessions = u.LoginSessions
            .Where(s => s.EndedAtUtc == null)
            .OrderByDescending(s => s.LoginAtUtc)
            .Take(10)
            .Select(s => new SessionSummaryDto(
                s.SessionId, s.IpAddress, s.UserAgent,
                s.LoginAtUtc, s.ExpiresAtUtc, true))
            .ToList();

        var recentAudit = await db.AuditHistories
            .Where(a => a.AppUserId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new AuditSummaryDto(
                a.Id, a.ActionType, a.EntityName, a.EntityKey, a.IpAddress, a.CreatedAt))
            .ToListAsync();

        return new UserProfileDto(
            u.Id, u.FirstName, u.LastName, u.Email, u.UserName,
            u.PhoneNumber,
            u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.EmployeeId).FirstOrDefault(),
            u.ProfilePhotoStorageKey, u.IsActive, u.IsLocked, u.TwoFactorEnabled,
            u.FailedLoginAttempts, u.LastLoginAt, u.CreatedAt, u.UpdatedAt,
            u.TenantUsers.Where(tu => tu.IsActive).Select(tu => tu.TenantId).FirstOrDefault(),
            u.TenantUsers.Where(tu => tu.IsActive && tu.Tenant != null).Select(tu => tu.Tenant!.Name).FirstOrDefault(),
            u.DepartmentId, u.Department?.Name,
            u.DesignationId, u.Designation?.Name,
            u.UserRoles.Where(ur => ur.IsActive && ur.Role != null)
                .Select(ur => new RoleSummaryDto(ur.Role!.Id, ur.Role.Name, ur.Role.Description)).ToList(),
            allPerms,
            u.ModuleAccesses.Where(uma => uma.IsActive && uma.Module != null)
                .Select(uma => new ModuleAccessSummaryDto(uma.Module!.Id, uma.Module.Name, uma.Module.Code, uma.Module.Route)).ToList(),
            u.UserApiRoutes.Where(ur => ur.IsActive && ur.ApiServiceRoute != null)
                .Select(ur => new RouteAccessSummaryDto(
                    ur.ApiServiceRoute!.Id, ur.ApiServiceRoute.HttpMethod,
                    ur.ApiServiceRoute.RoutePattern, ur.ApiServiceRoute.RequiredPermissionCode)).ToList(),
            sessions,
            recentAudit);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] UserCreateDto dto)
    {
        if (dto.TenantIds is null || dto.TenantIds.Count == 0)
            return BadRequest(new { error = "At least one TenantId is required for automatic EmployeeId generation." });

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        // ── Per-tenant serialization ─────────────────────────────────────
        // We wrap ID generation and the INSERT in the SAME transaction.
        // The generator issues SELECT ... FOR UPDATE on auth_tenants row,
        // so a concurrent Create for the same tenant will block at the
        // generator call until we commit. This makes the
        // (read-max → compute-next → insert) sequence atomic per tenant.
        await using var tx = await db.Database.BeginTransactionAsync();

        var normalizedEmail = dto.Email.ToUpperInvariant();
        if (await db.AppUsers.AnyAsync(u => u.NormalizedEmail == normalizedEmail))
        {
            await tx.RollbackAsync();
            return BadRequest(new { error = "A user with this email already exists." });
        }

        var normalizedUserName = dto.UserName.ToUpperInvariant();
        if (await db.AppUsers.AnyAsync(u => u.NormalizedUserName == normalizedUserName))
        {
            await tx.RollbackAsync();
            return BadRequest(new { error = "A user with this username already exists." });
        }

        var invalidTenantIds = dto.TenantIds.Where(tid => !db.Tenants.Any(t => t.Id == tid)).ToList();
        if (invalidTenantIds.Count != 0)
        {
            await tx.RollbackAsync();
            return BadRequest(new { error = $"The following tenant IDs do not exist: [{string.Join(", ", invalidTenantIds)}]" });
        }

        var user = new AppUser
        {
            FirstName = dto.FirstName, LastName = dto.LastName,
            Email = dto.Email, NormalizedEmail = dto.Email.ToUpperInvariant(),
            UserName = dto.UserName, NormalizedUserName = dto.UserName.ToUpperInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber = dto.PhoneNumber, DepartmentId = dto.DepartmentId,
            DesignationId = dto.DesignationId, IsActive = true
        };

        db.AppUsers.Add(user);
        await db.SaveChangesAsync();

        foreach (var tenantId in dto.TenantIds)
        {
            var employeeId = await employeeIdGenerator.GenerateNextEmployeeIdAsync(tenantId, dto.DepartmentId);
            db.TenantUsers.Add(new TenantUser
            {
                AppUserId  = user.Id,
                TenantId   = tenantId,
                EmployeeId = employeeId
            });
        }

        foreach (var roleId in dto.RoleIds ?? new List<long>())
            db.UserRoles.Add(new UserRole { AppUserId = user.Id, RoleId = roleId });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { user.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] UserUpdateDto dto)
    {
        var user = await db.AppUsers
            .Include(u => u.TenantUsers)
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.FirstName = dto.FirstName; user.LastName = dto.LastName;
        user.PhoneNumber = dto.PhoneNumber; user.DepartmentId = dto.DepartmentId;
        user.DesignationId = dto.DesignationId; user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.Password) && dto.Password.Length < 6)
            return BadRequest(new { error = "Password must be at least 6 characters." });

        if (!string.IsNullOrWhiteSpace(dto.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // ── Replace tenant + role links in a single transaction ─────────
        if (dto.TenantIds is not null)
        {
            var invalidIds = dto.TenantIds.Where(tid => !db.Tenants.Any(t => t.Id == tid)).ToList();
            if (invalidIds.Count != 0)
                return BadRequest(new { error = $"The following tenant IDs do not exist: [{string.Join(", ", invalidIds)}]" });
        }

        await using (var tx = await db.Database.BeginTransactionAsync())
        {
            if (dto.TenantIds is not null)
            {
                var desired = dto.TenantIds.ToHashSet();

                foreach (var stale in user.TenantUsers.Where(tu => tu.IsActive && !desired.Contains(tu.TenantId)).ToList())
                {
                    stale.IsActive = false;
                    stale.UpdatedAt = DateTime.UtcNow;
                }

                foreach (var tenantId in desired)
                {
                    var existing = user.TenantUsers.FirstOrDefault(tu => tu.TenantId == tenantId);
                    if (existing is not null)
                    {
                        if (!existing.IsActive)
                        {
                            existing.IsActive = true;
                            existing.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        var newEmployeeId = await employeeIdGenerator.GenerateNextEmployeeIdAsync(tenantId, user.DepartmentId);
                        user.TenantUsers.Add(new TenantUser
                        {
                            AppUserId  = user.Id,
                            TenantId   = tenantId,
                            EmployeeId = newEmployeeId
                        });
                    }
                }
            }

            // Sync roles — soft-delete stale, add new
            var desiredRoleIds = (dto.RoleIds ?? new List<long>()).ToHashSet();
            foreach (var ur in user.UserRoles.Where(ur => ur.IsActive && !desiredRoleIds.Contains(ur.RoleId)).ToList())
            {
                ur.IsActive = false;
                ur.UpdatedAt = DateTime.UtcNow;
            }
            foreach (var roleId in desiredRoleIds.Where(rid => !user.UserRoles.Any(ur => ur.RoleId == rid && ur.IsActive)))
                db.UserRoles.Add(new UserRole { AppUserId = user.Id, RoleId = roleId });

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        return NoContent();
    }

    [HttpPut("{id:long}/roles")]
    public async Task<ActionResult> UpdateRoles(long id, [FromBody] UserRoleUpdateDto dto)
    {
        var user = await db.AppUsers
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound();

        db.UserRoles.RemoveRange(user.UserRoles.Where(ur => ur.IsActive));
        foreach (var roleId in dto.RoleIds)
            db.UserRoles.Add(new UserRole { AppUserId = user.Id, RoleId = roleId });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:long}/permissions")]
    public async Task<ActionResult<List<long>>> GetPermissions(long id)
    {
        if (!await db.AppUsers.AnyAsync(u => u.Id == id))
            return NotFound();

        var ids = await db.UserPermissions
            .Where(up => up.AppUserId == id && up.IsActive)
            .Select(up => up.PermissionId)
            .ToListAsync();

        return Ok(ids);
    }

    [HttpPut("{id:long}/permissions")]
    public async Task<ActionResult> UpdatePermissions(long id, [FromBody] UserPermissionUpdateDto dto)
    {
        var user = await db.AppUsers
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        foreach (var up in user.UserPermissions.Where(up => up.IsActive))
        {
            up.IsActive = false;
            up.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var pid in dto.PermissionIds)
            db.UserPermissions.Add(new UserPermission { AppUserId = id, PermissionId = pid });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:long}/modules")]
    public async Task<ActionResult<List<long>>> GetModuleAccesses(long id)
    {
        if (!await db.AppUsers.AnyAsync(u => u.Id == id))
            return NotFound();

        var ids = await db.UserModuleAccesses
            .Where(uma => uma.AppUserId == id && uma.IsActive)
            .Select(uma => uma.ModuleId)
            .ToListAsync();

        return Ok(ids);
    }

    [HttpPut("{id:long}/modules")]
    public async Task<ActionResult> UpdateModuleAccesses(long id, [FromBody] UserModuleAccessUpdateDto dto)
    {
        var user = await db.AppUsers
            .Include(u => u.ModuleAccesses)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        foreach (var uma in user.ModuleAccesses.Where(uma => uma.IsActive))
        {
            uma.IsActive = false;
            uma.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var mid in dto.ModuleIds)
            db.UserModuleAccesses.Add(new UserModuleAccess { AppUserId = id, ModuleId = mid });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:long}/routes")]
    public async Task<ActionResult<List<long>>> GetRouteAccesses(long id)
    {
        if (!await db.AppUsers.AnyAsync(u => u.Id == id))
            return NotFound();

        var ids = await db.UserApiRoutes
            .Where(ur => ur.AppUserId == id && ur.IsActive)
            .Select(ur => ur.ApiServiceRouteId)
            .ToListAsync();

        return Ok(ids);
    }

    [HttpPut("{id:long}/routes")]
    public async Task<ActionResult> UpdateRouteAccesses(long id, [FromBody] UserRouteAccessUpdateDto dto)
    {
        var user = await db.AppUsers
            .Include(u => u.UserApiRoutes)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        foreach (var ur in user.UserApiRoutes.Where(ur => ur.IsActive))
        {
            ur.IsActive = false;
            ur.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var rid in dto.RouteIds)
            db.UserApiRoutes.Add(new UserApiRoute { AppUserId = id, ApiServiceRouteId = rid });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:long}/lock")]
    public async Task<ActionResult> Lock(long id)
    {
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound();
        user.IsLocked = true; user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:long}/unlock")]
    public async Task<ActionResult> Unlock(long id)
    {
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound();
        user.IsLocked = false; user.FailedLoginAttempts = 0;
        user.LockoutEnd = null; user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var user = await db.AppUsers
            .Include(u => u.TenantUsers)
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        user.IsActive = false; user.UpdatedAt = DateTime.UtcNow;

        foreach (var tu in user.TenantUsers.Where(tu => tu.IsActive))
        {
            tu.IsActive = false;
            tu.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var ur in user.UserRoles.Where(ur => ur.IsActive))
        {
            ur.IsActive = false;
            ur.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static readonly HashSet<string> AllowedPhotoTypes = new(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png", "image/webp" };
    private const long MaxPhotoSize = 5 * 1024 * 1024; // 5 MB

    [HttpPost("{id:long}/photo")]
    public async Task<IActionResult> UploadPhoto(long id, IFormFile file)
    {
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (!AllowedPhotoTypes.Contains(file.ContentType))
            return BadRequest(new { error = "Only JPEG, PNG, and WebP images are allowed." });

        if (file.Length > MaxPhotoSize)
            return BadRequest(new { error = "File size must be under 5 MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";

        var storageKey = $"profile-photos/{user.UserName}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}{ext}";
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "profile-photos");
        if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", storageKey);
        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        // Delete old photo if exists
        if (!string.IsNullOrEmpty(user.ProfilePhotoStorageKey))
        {
            var oldPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", user.ProfilePhotoStorageKey);
            if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
        }

        user.ProfilePhotoStorageKey = storageKey;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { profilePhotoStorageKey = storageKey });
    }

    [HttpDelete("{id:long}/photo")]
    public async Task<IActionResult> DeletePhoto(long id)
    {
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound();

        if (!string.IsNullOrEmpty(user.ProfilePhotoStorageKey))
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", user.ProfilePhotoStorageKey);
            if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
        }

        user.ProfilePhotoStorageKey = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }
}
