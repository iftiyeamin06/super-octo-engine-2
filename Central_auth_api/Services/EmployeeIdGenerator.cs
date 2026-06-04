using CentralAuth.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CentralAuth.Api.Services;

public class EmployeeIdOptions
{
    public string Prefix { get; set; } = "EMP-";
    public int Padding { get; set; } = 3;
}

public interface IEmployeeIdGenerator
{
    Task<string> GenerateNextEmployeeIdAsync(long tenantId, CancellationToken ct = default);
}

public class EmployeeIdGenerator : IEmployeeIdGenerator
{
    private readonly CentralAuthDbContext _db;
    private readonly EmployeeIdOptions _options;

    public EmployeeIdGenerator(CentralAuthDbContext db, IOptions<EmployeeIdOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public async Task<string> GenerateNextEmployeeIdAsync(long tenantId, CancellationToken ct = default)
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
        var tenantExists = await _db.Tenants
            .FromSqlRaw("SELECT * FROM auth_tenants WHERE Id = {0} FOR UPDATE", tenantId)
            .AnyAsync(ct);

        if (!tenantExists)
            throw new InvalidOperationException($"Tenant {tenantId} not found.");

        // ── Find the highest existing EmployeeId for this tenant ────────
        // We order by Length DESC, then by value DESC, so IDs with more
        // digits sort after shorter ones ("EMP-100" after "EMP-99") which
        // gives correct numeric ordering even if the column contains
        // irregularly-padded legacy values.
        var lastId = await _db.AppUsers
            .Where(u => u.TenantId == tenantId && u.EmployeeId != null)
            .OrderByDescending(u => u.EmployeeId!.Length)
            .ThenByDescending(u => u.EmployeeId)
            .Select(u => u.EmployeeId)
            .FirstOrDefaultAsync(ct);

        return ComputeNextId(lastId);
    }

    private string ComputeNextId(string? lastId)
    {
        var prefix = _options.Prefix;

        // No employees yet for this tenant → start at 1.
        if (string.IsNullOrEmpty(lastId) || !lastId.StartsWith(prefix, StringComparison.Ordinal))
            return Format(1);

        // Strip the prefix and parse the numeric suffix.
        // 'EMP-'    → numericPart = '015'  → 15
        // 'EMP-99'  → numericPart = '99'   → 99
        var numericPart = lastId[prefix.Length..];

        // Guard against malformed legacy rows. If we can't parse, we
        // restart the sequence at 1 (and the unique index will catch a
        // collision on INSERT if there is one).
        if (!int.TryParse(numericPart, out var current) || current < 0)
            return Format(1);

        return Format(current + 1);
    }

    private string Format(int number) =>
        $"{_options.Prefix}{number.ToString().PadLeft(_options.Padding, '0')}";
}
