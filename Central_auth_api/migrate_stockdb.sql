-- ============================================================
-- Migration: stockdb  →  centerl_auth
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Clear destination tables (preserve permissions & services) ──
TRUNCATE TABLE centerl_auth.auth_user_datatable_preferences;
TRUNCATE TABLE centerl_auth.auth_user_login_sessions;
TRUNCATE TABLE centerl_auth.auth_token_blacklist;
TRUNCATE TABLE centerl_auth.auth_otp_verifications;
TRUNCATE TABLE centerl_auth.auth_password_reset_tokens;
TRUNCATE TABLE centerl_auth.auth_userpageaccesses;
TRUNCATE TABLE centerl_auth.auth_usermoduleaccesses;
TRUNCATE TABLE centerl_auth.auth_role_claims;
TRUNCATE TABLE centerl_auth.auth_user_claims;
TRUNCATE TABLE centerl_auth.auth_rolepermissions;
TRUNCATE TABLE centerl_auth.auth_userroles;
TRUNCATE TABLE centerl_auth.auth_rolemodules;
TRUNCATE TABLE centerl_auth.auth_audithistories;
TRUNCATE TABLE centerl_auth.auth_appusers;
TRUNCATE TABLE centerl_auth.auth_roles;
TRUNCATE TABLE centerl_auth.auth_pages;
TRUNCATE TABLE centerl_auth.auth_modules;
TRUNCATE TABLE centerl_auth.auth_departments;
TRUNCATE TABLE centerl_auth.auth_designations;

-- ── 2. Departments ─────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_departments
    (Id, TenantId, Name, Description, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, NULL, Name, Description, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.departments;

-- ── 3. Designations ────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_designations
    (Id, TenantId, Name, Description, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, NULL, Name, Description, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.designations;

-- ── 4. Roles ───────────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_roles
    (Id, TenantId, Name, Description, IsActive, IsSystem, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, NULL, Name, Description, IsActive,
    CASE WHEN Name IN ('SuperAdmin','Admin') THEN 1 ELSE 0 END,
    CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.roles;

-- ── 5. Modules (derive Code from Name) ────────────────────────────
INSERT INTO centerl_auth.auth_modules
    (Id, Name, Code, Route, Icon, SortOrder, ParentId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id,
    Name,
    UPPER(REPLACE(REPLACE(TRIM(Name), ' ', '_'), '-', '_')) AS Code,
    Route,
    NULL,
    ROW_NUMBER() OVER (ORDER BY Id) * 10,
    NULL,
    IsActive,
    CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.modules;

-- ── 6. Pages ───────────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_pages
    (Id, ModuleId, Name, Route, SortOrder, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, ModuleId, Name, Route, SortOrder, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.apppages;

-- ── 7. App Users ───────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_appusers
    (Id, TenantId, FirstName, LastName, Email, NormalizedEmail, UserName, NormalizedUserName,
     ProfilePhotoStorageKey, PasswordHash, PhoneNumber, DepartmentId, DesignationId,
     IsActive, IsLocked, LockoutEnd, TwoFactorEnabled, TwoFactorMethod,
     FailedLoginAttempts, LastLoginAt, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, NULL,
    FirstName, LastName, Email, NormalizedEmail, UserName, NormalizedUserName,
    ProfilePhotoStorageKey, PasswordHash, PhoneNumber, DepartmentId, DesignationId,
    IsActive,
    0 AS IsLocked,
    NULL AS LockoutEnd,
    0 AS TwoFactorEnabled,
    NULL AS TwoFactorMethod,
    0 AS FailedLoginAttempts,
    NULL AS LastLoginAt,
    CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.appusers;

-- ── 8. User Roles ──────────────────────────────────────────────────
INSERT INTO centerl_auth.auth_userroles
    (Id, AppUserId, RoleId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, AppUserId, RoleId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.userroles;

-- ── 9. Role Modules (deduplicate on RoleId+ModuleId) ──────────────
INSERT INTO centerl_auth.auth_rolemodules
    (Id, RoleId, ModuleId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    MIN(Id), RoleId, ModuleId, MAX(IsActive), MIN(CreatedAt), MAX(UpdatedAt), MIN(CreatedBy), MIN(UpdatedBy)
FROM stockdb.rolemodules
GROUP BY RoleId, ModuleId;

-- ── 10. User Module Accesses ───────────────────────────────────────
INSERT INTO centerl_auth.auth_usermoduleaccesses
    (Id, AppUserId, ModuleId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
SELECT
    Id, AppUserId, ModuleId, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
FROM stockdb.usermoduleaccesses;

-- ── 11. Login Sessions ─────────────────────────────────────────────
INSERT INTO centerl_auth.auth_user_login_sessions
    (Id, AppUserId, SessionId, DeviceId, IpAddress, UserAgent,
     LoginAtUtc, LastSeenAtUtc, ExpiresAtUtc, EndedAtUtc, EndedReason,
     CloseRequestedAtUtc, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy,
     RefreshToken, RefreshTokenExpiresAt, RefreshTokenRevokedAt)
SELECT
    Id, AppUserId, SessionId, DeviceId, IpAddress, UserAgent,
    LoginAtUtc, LastSeenAtUtc, ExpiresAtUtc, EndedAtUtc, EndedReason,
    CloseRequestedAtUtc, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy,
    NULL, NULL, NULL
FROM stockdb.user_login_sessions;

-- ── 12. User Datatable Preferences ────────────────────────────────
INSERT INTO centerl_auth.auth_user_datatable_preferences
    (Id, AppUserId, PreferenceKey, StateJson, CreatedAt, UpdatedAt)
SELECT
    Id, AppUserId, PreferenceKey, StateJson, CreatedAt, UpdatedAt
FROM stockdb.user_datatable_preferences;

-- ── 13. Audit Histories ────────────────────────────────────────────
INSERT INTO centerl_auth.auth_audithistories
    (Id, TenantId, AppUserId, ServiceId, ActionType, EntityName, EntityKey,
     OldValues, NewValues, IpAddress, DeviceId, IsActive, CreatedAt)
SELECT
    Id, NULL, AppUserId, NULL,
    LEFT(ActionType, 100),
    LEFT(EntityName, 150),
    LEFT(COALESCE(EntityKey, ''), 150),
    OldValues, NewValues,
    LEFT(COALESCE(IpAddress, ''), 64),
    NULL,
    IsActive,
    CreatedAt
FROM stockdb.audithistories;

-- ── Re-enable FK checks ────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── Verify row counts ──────────────────────────────────────────────
SELECT 'auth_departments'               AS tbl, COUNT(*) AS row_count FROM centerl_auth.auth_departments
UNION ALL SELECT 'auth_designations',   COUNT(*) FROM centerl_auth.auth_designations
UNION ALL SELECT 'auth_roles',          COUNT(*) FROM centerl_auth.auth_roles
UNION ALL SELECT 'auth_modules',        COUNT(*) FROM centerl_auth.auth_modules
UNION ALL SELECT 'auth_pages',          COUNT(*) FROM centerl_auth.auth_pages
UNION ALL SELECT 'auth_appusers',       COUNT(*) FROM centerl_auth.auth_appusers
UNION ALL SELECT 'auth_userroles',      COUNT(*) FROM centerl_auth.auth_userroles
UNION ALL SELECT 'auth_rolemodules',    COUNT(*) FROM centerl_auth.auth_rolemodules
UNION ALL SELECT 'auth_usermoduleaccesses', COUNT(*) FROM centerl_auth.auth_usermoduleaccesses
UNION ALL SELECT 'auth_user_login_sessions', COUNT(*) FROM centerl_auth.auth_user_login_sessions
UNION ALL SELECT 'auth_user_datatable_preferences', COUNT(*) FROM centerl_auth.auth_user_datatable_preferences
UNION ALL SELECT 'auth_audithistories', COUNT(*) FROM centerl_auth.auth_audithistories;
