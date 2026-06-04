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
    [HttpGet]
    public async Task<PagedResult<UserListDto>> GetAll(
        [FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] long? tenantId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = db.AppUsers
            .Include(u => u.Tenant)
            .Include(u => u.Department)
            .Include(u => u.Designation)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.FirstName.Contains(search) || u.LastName.Contains(search) || u.Email.Contains(search));

        if (tenantId.HasValue) q = q.Where(u => u.TenantId == tenantId);

        q = status switch
        {
            "active"   => q.Where(u => u.IsActive && !u.IsLocked),
            "inactive" => q.Where(u => !u.IsActive),
            "locked"   => q.Where(u => u.IsLocked),
            _          => q
        };

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new UserListDto(
                u.Id, u.FirstName, u.LastName, u.Email, u.UserName,
                u.EmployeeId,
                u.ProfilePhotoStorageKey, u.IsActive, u.IsLocked, u.TwoFactorEnabled,
                u.FailedLoginAttempts, u.LastLoginAt, u.CreatedAt,
                u.TenantId, u.Tenant != null ? u.Tenant.Name : null,
                u.DepartmentId, u.Department != null ? u.Department.Name : null,
                u.DesignationId, u.Designation != null ? u.Designation.Name : null,
                u.UserRoles.Where(ur => ur.IsActive).Select(ur => ur.Role.Name).ToList()))
            .ToListAsync();

        return new PagedResult<UserListDto> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<UserListDto>> GetById(long id)
    {
        var u = await db.AppUsers
            .Include(u => u.Tenant).Include(u => u.Department).Include(u => u.Designation)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (u is null) return NotFound();

        return new UserListDto(u.Id, u.FirstName, u.LastName, u.Email, u.UserName,
            u.EmployeeId,
            u.ProfilePhotoStorageKey, u.IsActive, u.IsLocked, u.TwoFactorEnabled,
            u.FailedLoginAttempts, u.LastLoginAt, u.CreatedAt,
            u.TenantId, u.Tenant?.Name, u.DepartmentId, u.Department?.Name,
            u.DesignationId, u.Designation?.Name,
            u.UserRoles.Where(ur => ur.IsActive).Select(ur => ur.Role.Name).ToList());
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] UserCreateDto dto)
    {
        if (dto.TenantId is null)
            return BadRequest(new { error = "TenantId is required for automatic EmployeeId generation." });

        // ── Per-tenant serialization ─────────────────────────────────────
        // We wrap ID generation and the INSERT in the SAME transaction.
        // The generator issues SELECT ... FOR UPDATE on auth_tenants row,
        // so a concurrent Create for the same tenant will block at the
        // generator call until we commit. This makes the
        // (read-max → compute-next → insert) sequence atomic per tenant.
        await using var tx = await db.Database.BeginTransactionAsync();

        var user = new AppUser
        {
            TenantId = dto.TenantId, FirstName = dto.FirstName, LastName = dto.LastName,
            Email = dto.Email, NormalizedEmail = dto.Email.ToUpperInvariant(),
            UserName = dto.UserName, NormalizedUserName = dto.UserName.ToUpperInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber = dto.PhoneNumber, DepartmentId = dto.DepartmentId,
            DesignationId = dto.DesignationId, IsActive = true
        };

        user.AssignEmployeeId(await employeeIdGenerator.GenerateNextEmployeeIdAsync(dto.TenantId.Value));

        db.AppUsers.Add(user);
        await db.SaveChangesAsync();

        foreach (var roleId in dto.RoleIds)
            db.UserRoles.Add(new UserRole { AppUserId = user.Id, RoleId = roleId });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { user.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] UserUpdateDto dto)
    {
        var user = await db.AppUsers.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.TenantId = dto.TenantId;
        user.FirstName = dto.FirstName; user.LastName = dto.LastName;
        user.PhoneNumber = dto.PhoneNumber; user.DepartmentId = dto.DepartmentId;
        user.DesignationId = dto.DesignationId; user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        // Sync roles
        db.UserRoles.RemoveRange(user.UserRoles);
        foreach (var roleId in dto.RoleIds)
            db.UserRoles.Add(new UserRole { AppUserId = user.Id, RoleId = roleId });

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
        var user = await db.AppUsers.FindAsync(id);
        if (user is null) return NotFound();
        user.IsActive = false; user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
