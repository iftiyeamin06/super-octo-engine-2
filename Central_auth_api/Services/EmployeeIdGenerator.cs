using CentralAuth.Api.Data;
using CentralAuth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Services;

public interface IEmployeeIdGenerator
{
    Task<string> GenerateNextEmployeeIdAsync(long tenantId, long? departmentId = null, CancellationToken ct = default);
}

public class EmployeeIdGenerator : IEmployeeIdGenerator
{
    private readonly CentralAuthDbContext _db;

    public EmployeeIdGenerator(CentralAuthDbContext db)
    {
        _db = db;
    }

    public async Task<string> GenerateNextEmployeeIdAsync(long tenantId, long? departmentId = null, CancellationToken ct = default)
    {
        // ── Per-tenant serialization ─────────────────────────────────────
        // Acquire a row-level lock on the tenant row. While this lock is
        // held, any concurrent call to GenerateNextEmployeeIdAsync for the
        // SAME tenant will block at this statement until we commit/rollback
        // the surrounding transaction. Calls for OTHER tenants proceed in
        // parallel because the lock is tenant-scoped.
        //
        // ⚠ CONTRACT: the caller MUST wrap this call AND the subsequent
        // AppUser INSERT in the same DbContext transaction. If you call
        // this method without a transaction, the lock is released the
        // moment we return and a concurrent request can race us.
        var tenant = await _db.Tenants
            .FromSqlRaw("SELECT * FROM auth_tenants WHERE Id = {0} FOR UPDATE", tenantId)
            .FirstOrDefaultAsync(ct);

        if (tenant is null)
            throw new InvalidOperationException($"Tenant {tenantId} not found.");

        // ── Resolve department code ──────────────────────────────────────
        // When available, include a 3-letter department code in the
        // Employee ID for at-a-glance identification.  The department
        // row is locked inside the same transaction so that a concurrent
        // rename does not produce a stale Code while we are generating.
        Department? department = null;
        if (departmentId.HasValue)
        {
            department = await _db.Departments
                .FromSqlRaw("SELECT * FROM auth_departments WHERE Id = {0} FOR UPDATE", departmentId.Value)
                .FirstOrDefaultAsync(ct);
        }

        var code = tenant.Code;
        var deptSuffix = department is not null ? $"{department.Code}-" : "";
        var pattern = $"{code}-{deptSuffix}EMP-";

        // ── Find the highest existing EmployeeId for this pattern ────────
        // We query ALL records (active and soft-deleted) so that deleted
        // IDs are never reused, preventing sequence collisions.
        // We order by Length DESC, then by value DESC, so IDs with more
        // digits sort after shorter ones e.g. "PLC-ENG-EMP-100" after
        // "PLC-ENG-EMP-99" which gives correct numeric ordering even if
        // the column contains irregularly-padded legacy values.
        var lastId = await _db.TenantUsers
            .Where(tu => tu.TenantId == tenantId && tu.EmployeeId != null && tu.EmployeeId.StartsWith(pattern))
            .OrderByDescending(tu => tu.EmployeeId!.Length)
            .ThenByDescending(tu => tu.EmployeeId)
            .Select(tu => tu.EmployeeId)
            .FirstOrDefaultAsync(ct);

        return ComputeNextId(lastId, pattern);
    }

    private static string ComputeNextId(string? lastId, string pattern)
    {
        // No employees yet for this pattern → start at 1.
        if (string.IsNullOrEmpty(lastId) || !lastId.StartsWith(pattern, StringComparison.Ordinal))
            return Format(pattern, 1);

        // Strip the pattern and parse the numeric suffix.
        // 'PLC-ENG-EMP-' → numericPart = '015'  → 15
        var numericPart = lastId[pattern.Length..];

        // Guard against malformed legacy rows. If we can't parse, we
        // restart the sequence at 1 (and the unique index will catch a
        // collision on INSERT if there is one).
        if (!int.TryParse(numericPart, out var current) || current < 0)
            return Format(pattern, 1);

        return Format(pattern, current + 1);
    }

    private static string Format(string pattern, int number) =>
        $"{pattern}{number.ToString().PadLeft(3, '0')}";
}
