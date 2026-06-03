# CentralAuth Database Schema (MySQL) — ER Diagram

> Auto-generated from the C# entity models (`CentralAuth.Api.Models`) and the live SQL dump (`Schema/central-auth.sql`).

```mermaid
erDiagram
    %% Declarations (the domain words Mermaid parses as keywords must be fenced)
    TENANT["auth_tenants"] {
        BIGINT Id PK "AUTO_INCREMENT"
        VARCHAR Name
        VARCHAR Code UK
        VARCHAR Description "nullable"
        VARCHAR ContactEmail "nullable"
        VARCHAR LogoUrl "nullable"
        VARCHAR SubscriptionPlan "nullable"
        DATETIME SubscriptionExpiresAt "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    APPUSER["auth_appusers (Users)"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT TenantId FK "nullable → auth_tenants.Id"
        VARCHAR FirstName
        VARCHAR LastName
        VARCHAR Email
        VARCHAR NormalizedEmail
        VARCHAR UserName
        VARCHAR NormalizedUserName
        VARCHAR ProfilePhotoStorageKey "nullable"
        LONGTEXT PasswordHash
        VARCHAR PhoneNumber "nullable"
        BIGINT DepartmentId FK "nullable → auth_departments.Id"
        BIGINT DesignationId FK "nullable → auth_designations.Id"
        TINYINT IsActive
        TINYINT IsLocked
        DATETIME LockoutEnd "nullable"
        TINYINT TwoFactorEnabled
        VARCHAR TwoFactorMethod "nullable"
        INT FailedLoginAttempts
        DATETIME LastLoginAt "nullable"
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    DEPARTMENT["auth_departments"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT TenantId FK "nullable → auth_tenants.Id"
        VARCHAR Name
        VARCHAR Description "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    DESIGNATION["auth_designations"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT TenantId FK "nullable → auth_tenants.Id"
        VARCHAR Name
        VARCHAR Description "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    ROLE["auth_roles (Roles)"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT TenantId FK "nullable → auth_tenants.Id"
        VARCHAR Name
        VARCHAR Description "nullable"
        TINYINT IsSystem "default 0"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    PERMISSION["auth_permissions (Permissions)"] {
        BIGINT Id PK "AUTO_INCREMENT"
        VARCHAR Code UK
        VARCHAR Name
        VARCHAR Description "nullable"
        TINYINT IsSystem "default 0"
        VARCHAR GroupName "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    USERROLE["auth_userroles (Junction)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        BIGINT RoleId FK "→ auth_roles.Id"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    ROLEPERMISSION["auth_rolepermissions (Junction)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT RoleId FK "→ auth_roles.Id"
        BIGINT PermissionId FK "→ auth_permissions.Id"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    USERLOGINSESSION["auth_user_login_sessions (Sessions)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        VARCHAR SessionId UK
        VARCHAR RefreshToken "nullable"
        DATETIME RefreshTokenExpiresAt "nullable"
        DATETIME RefreshTokenRevokedAt "nullable"
        VARCHAR DeviceId "nullable"
        VARCHAR IpAddress "nullable"
        VARCHAR UserAgent "nullable"
        DATETIME LoginAtUtc
        DATETIME LastSeenAtUtc
        DATETIME ExpiresAtUtc
        DATETIME EndedAtUtc "nullable"
        VARCHAR EndedReason "nullable"
        DATETIME CloseRequestedAtUtc "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    AUDITHISTORY["auth_audithistories (AuditLogs)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT TenantId FK "nullable → auth_tenants.Id"
        BIGINT AppUserId FK "nullable → auth_appusers.Id"
        BIGINT ServiceId FK "nullable → auth_services.Id"
        VARCHAR ActionType
        VARCHAR EntityName
        VARCHAR EntityKey
        LONGTEXT OldValues "nullable"
        LONGTEXT NewValues "nullable"
        VARCHAR IpAddress "nullable"
        VARCHAR DeviceId "nullable"
        DATETIME CreatedAt
        TINYINT IsActive
    }

    MODULE["auth_modules"] {
        BIGINT Id PK "AUTO_INCREMENT"
        VARCHAR Name
        VARCHAR Code UK
        BIGINT ParentId FK "nullable → auth_modules.Id"
        INT SortOrder
        VARCHAR Icon "nullable"
        VARCHAR Route
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    PAGE["auth_pages"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT ModuleId FK "→ auth_modules.Id"
        VARCHAR Name
        VARCHAR Route
        INT SortOrder
        VARCHAR Icon "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    ROLEMODULE["auth_rolemodules (Junction)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT RoleId FK "→ auth_roles.Id"
        BIGINT ModuleId FK "→ auth_modules.Id"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    USERMODULEACCESS["auth_usermoduleaccesses (Junction)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        BIGINT ModuleId FK "→ auth_modules.Id"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    USERPAGEACCESS["auth_userpageaccesses (Junction)") {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        BIGINT PageId FK "→ auth_pages.Id"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    SERVICE["auth_services"] {
        BIGINT Id PK "AUTO_INCREMENT"
        VARCHAR Name
        VARCHAR Code UK
        VARCHAR Description "nullable"
        VARCHAR BaseUrl "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    SERVICEAPIKEY["auth_service_api_keys"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT ServiceId FK "→ auth_services.Id"
        VARCHAR KeyHash UK
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    ROLECLAIM["auth_role_claims"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT RoleId FK "→ auth_roles.Id"
        VARCHAR ClaimType
        VARCHAR ClaimValue
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    USERCLAIM["auth_user_claims"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        VARCHAR ClaimType
        VARCHAR ClaimValue
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
        INT CreatedBy "nullable"
        INT UpdatedBy "nullable"
    }

    TOKENBLACKLIST["auth_token_blacklist"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "nullable → auth_appusers.Id"
        VARCHAR TokenJti UK
        DATETIME ExpiresAt
        TINYINT IsActive
        DATETIME CreatedAt
    }

    PASSWORDRESETTOKEN["auth_password_reset_tokens"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        VARCHAR TokenHash UK
        DATETIME ExpiresAt
        DATETIME? UsedAt "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
    }

    OTPVERIFICATION["auth_otp_verifications"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        VARCHAR OtpCode
        VARCHAR Purpose
        DATETIME ExpiresAt
        DATETIME? VerifiedAt "nullable"
        TINYINT IsActive
        DATETIME CreatedAt
    }

    USERDATATABLEPREFERENCE["auth_user_datatable_preferences"] {
        BIGINT Id PK "AUTO_INCREMENT"
        BIGINT AppUserId FK "→ auth_appusers.Id"
        VARCHAR TableKey
        LONGTEXT PreferenceJson
        TINYINT IsActive
        DATETIME CreatedAt
        DATETIME UpdatedAt "nullable"
    }

    %% ──────────────── Relationships ────────────────
    TENANT ||--o{ APPUSER : "has many (Restrict)"
    TENANT ||--o{ DEPARTMENT : "has many (Restrict)"
    TENANT ||--o{ DESIGNATION : "has many (Restrict)"
    TENANT ||--o{ ROLE : "has many (Restrict)"
    TENANT ||--o{ AUDITHISTORY : "audited (SetNull)"

    APPUSER ||--o{ USERROLE : "assigned"
    APPUSER ||--o{ USERLOGINSESSION : "has sessions (Cascade)"
    APPUSER ||--o{ USERCLAIM : "claims (Cascade)"
    APPUSER ||--o{ USERMODULEACCESS : "direct module access (Cascade)"
    APPUSER ||--o{ USERPAGEACCESS : "direct page access (Cascade)"
    APPUSER ||--o{ TOKENBLACKLIST : "blacklisted (SetNull)"
    APPUSER ||--o{ PASSWORDRESETTOKEN : "reset tokens (Cascade)"
    APPUSER ||--o{ OTPVERIFICATION : "OTP verifications (Cascade)"
    APPUSER ||--o{ USERDATATABLEPREFERENCE : "table prefs (Cascade)"
    APPUSER ||--o{ AUDITHISTORY : "performed (SetNull)"

    DEPARTMENT ||--o{ APPUSER : "has staff (SetNull)"
    DESIGNATION ||--o{ APPUSER : "has staff (SetNull)"

    ROLE ||--o{ USERROLE : "assigned to users (Cascade)"
    ROLE ||--o{ ROLEPERMISSION : "grants (Cascade)"
    ROLE ||--o{ ROLEMODULE : "maps to modules (Cascade)"
    ROLE ||--o{ ROLECLAIM : "claims (Cascade)"

    PERMISSION ||--o{ ROLEPERMISSION : "granted via roles (Cascade)"

    MODULE ||--o{ PAGE : "contains pages (Cascade)"
    MODULE ||--o{ ROLEMODULE : "accessible by role (Cascade)"
    MODULE ||--o{ USERMODULEACCESS : "accessible by user (Cascade)"
    MODULE ||--o{ MODULE : "parent → child (Self-Ref, Restrict)"

    PAGE ||--o{ USERPAGEACCESS : "accessible by user (Cascade)"

    SERVICE ||--o{ SERVICEAPIKEY : "has keys (Cascade)"
    SERVICE ||--o{ AUDITHISTORY : "audited (SetNull)"
```

---

### Legend

| Symbol | Meaning |
|--------|---------|
| `||--o{` | One-to-Many |
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UK` | Unique Key |

### Key Constraints (from `CentralAuthDbContext`)

- **AppUser** — `UNIQUE INDEX` on `(TenantId, NormalizedEmail)` and `(TenantId, NormalizedUserName)`
- **Role** — `UNIQUE INDEX` on `(TenantId, Name)`
- **Permission** — `UNIQUE INDEX` on `Code`
- **Module** — `UNIQUE INDEX` on `Code`
- **UserRole** — `UNIQUE INDEX` on `(AppUserId, RoleId)`
- **RolePermission** — `UNIQUE INDEX` on `(RoleId, PermissionId)`
- **RoleModule** — `UNIQUE INDEX` on `(RoleId, ModuleId)`
- **UserModuleAccess** — `UNIQUE INDEX` on `(AppUserId, ModuleId)`
- **UserPageAccess** — `UNIQUE INDEX` on `(AppUserId, PageId)`
- **UserLoginSession** — `UNIQUE INDEX` on `SessionId`
- **AuditHistory** — `INDEX` on `(EntityName, EntityKey)`, `(CreatedAt)`, `(ActionType)`
