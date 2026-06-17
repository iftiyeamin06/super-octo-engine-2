# CentralAuth — Architecture Document

Multi-tenant role-based access control system with 3 orthogonal access layers.
Built with **React 19 + Vite 8** (frontend), **.NET 8 Web API** (backend), **MySQL 8** (database).

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Database Schema & Entity Relationships](#3-database-schema--entity-relationships)
4. [Three-Layer Access Control](#4-three-layer-access-control)
5. [The Login Cycle](#5-the-login-cycle)
6. [Admin Configuration Flows](#6-admin-configuration-flows)
7. [Backend Middleware Guard](#7-backend-middleware-guard)
8. [Client-Side Guards](#8-client-side-guards)
9. [Complete Data Flow](#9-complete-data-flow)
10. [Key Design Decisions](#10-key-design-decisions)
11. [Route Protection Matrix](#11-route-protection-matrix)
12. [Security Measures](#12-security-measures)
13. [User Profile System](#13-user-profile-system)

---

## 1. Project Overview

```
super-octo-engine-2/
├── Central_auth_api/          # .NET 8 Web API backend
│   ├── Controllers/           # 15 API controllers
│   ├── Models/                # 26 EF Core entities
│   ├── DTOs/                  # 16+ request/response DTOs
│   ├── Filters/               # DynamicPermissionMiddleware + Filter
│   ├── Data/                  # DbContext + Migrations (9)
│   ├── Services/              # EmployeeIdGenerator
│   └── Program.cs             # DI, middleware pipeline, CORS, Swagger, Rate Limiting
│
├── Central_auth/              # React 19 + Vite 8 frontend
│   ├── src/pages/             # 15 page components
│   ├── src/components/        # 9 reusable components
│   ├── src/lib/               # api.ts, auth.ts, utils.ts
│   └── vite.config.ts         # Proxy /api/* → backend :5089
│
├── Schema/                    # DB reference scripts
├── Scripts/
└── ARCHITECTURE.md            # This file
```

| Component | Technology | Port |
|-----------|-----------|------|
| Backend | ASP.NET Core 8, EF Core 8 (Pomelo MySQL) | `:5089` |
| Frontend | React 19, Vite 8, Tailwind 3.4, Radix UI | `:5173` |
| Database | MySQL 8 (`centerl_auth`, tables prefixed `auth_`) | `:3306` |
| Auth | JWT Bearer, HMAC-SHA256, BCrypt, Rate Limiting | — |

---

## 2. Project Structure

### Backend — `Central_auth_api/`

```
Central_auth_api/
├── Program.cs                          # DI, middleware pipeline, Swagger, CORS
├── Models/
│   ├── BaseEntity.cs                   # Abstract: Id, IsActive, CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
│   ├── AppUser.cs                      # Core user (email, password hash, dept, designation, 2FA, lockout)
│   ├── Role.cs                         # Tenant-scoped role, IsSystem flag
│   ├── Permission.cs                   # Granular permission code (unique), group name
│   ├── Tenant.cs, Department.cs, Designation.cs  # Multi-tenancy hierarchy
│   ├── TenantUser.cs                   # User–Tenant membership with EmployeeId
│   ├── UserRole.cs                     # User ↔ Role junction
│   ├── RolePermission.cs               # Role ↔ Permission junction
│   ├── UserPermission.cs               # Direct User ↔ Permission junction (layer 2)
│   ├── ModulePermission.cs             # Module ↔ Permission junction (sidebar visibility)
│   ├── Module.cs, Page.cs              # Navigation hierarchy (self-referencing via ParentId)
│   ├── UserModuleAccess.cs             # Direct User ↔ Module grant (layer 2)
│   ├── UserPageAccess.cs               # User ↔ Page grant
│   ├── ApiServiceRoute.cs              # Route definition with required permission code
│   ├── UserApiRoute.cs                 # Direct User ↔ Route bypass (layer 3)
│   ├── UserClaim.cs, RoleClaim.cs      # Custom claims storage
│   ├── UserLoginSession.cs             # Active session tracking
│   ├── TokenBlacklist.cs               # JWT JTI-based revocation
│   ├── PasswordResetToken.cs, OtpVerification.cs  # Auth infrastructure
│   ├── AuditHistory.cs                 # Auto-logged entity changes
│   └── UserDatatablePreference.cs       # UI state persistence
│
├── DTOs/
│   ├── AuthDtos.cs                      # LoginRequest, LoginResponse, RefreshRequest
│   ├── UserDtos.cs                      # UserListDto, Create/Update, Role/Module/Route update DTOs
│   ├── UserProfileDtos.cs               # UserProfileDto, RoleSummary, PermissionSummary, SessionSummary, AuditSummary
│   ├── RoleDtos.cs                      # RoleListDto, RoleDetailDto, PermissionDto, Module DTOs
│   ├── RouteDtos.cs                     # RouteListItemDto, Create/Update DTOs
│   ├── TenantDtos.cs                    # Tenant CRUD DTOs
│   ├── DashboardDtos.cs                 # Stats, RecentUser, AuditActivity
│   └── PagedResult.cs                   # Generic paged result wrapper
│
├── Controllers/
│   ├── AuthController.cs                # POST /api/auth/login (rate-limited), logout (JWT blacklist), introspect, check-permission
│   ├── UsersController.cs               # GET/POST/PUT /api/users, roles/modules/routes endpoints, lock/unlock, profile, photo upload
│   ├── RolesController.cs               # CRUD /api/roles, soft-delete
│   ├── PermissionsController.cs         # CRUD /api/permissions, GET /groups
│   ├── ModulesController.cs             # CRUD /api/modules, accessible, pages, permissions, routes (nested), auto-generate permissions
│   ├── RoutesController.cs              # CRUD /api/routes (global)
│   ├── TenantsController.cs             # CRUD /api/tenants
│   ├── DepartmentsController.cs         # CRUD /api/departments
│   ├── DesignationsController.cs        # CRUD /api/designations
│   ├── DashboardController.cs           # GET /api/dashboard/stats, recent-users, recent-audit
│   ├── AuditController.cs               # GET /api/audit (paginated, filterable)
│   ├── SessionsController.cs            # GET /api/sessions, revoke, revoke-all
│   ├── MockAppController.cs             # HTML mock pages for RBAC testing
│   ├── TestEndpointsController.cs       # Mock API gated by DynamicPermissionFilter
│   └── TestLabController.cs             # Interactive browser test lab
│
├── Filters/
│   ├── DynamicPermissionMiddleware.cs   # Global middleware: route matching + direct route bypass
│   └── DynamicPermissionFilter.cs      # IAsyncAuthorizationFilter (redundant safety layer)
│
├── Data/
│   └── CentralAuthDbContext.cs          # 25 DbSets, audit override in SaveChangesAsync
│
├── Migrations/                          # 9 migrations (Initial → AddUserApiRouteTable)
└── Services/
    └── EmployeeIdGenerator.cs           # Per-tenant serial ID (SELECT...FOR UPDATE)
```

### Frontend — `Central_auth/`

```
Central_auth/src/
├── App.tsx                              # BrowserRouter + ProtectedRoute wrapper
│
├── pages/                              # 15 page components
│   ├── Login.tsx                        # Email/password → JWT → localStorage
│   ├── Dashboard.tsx                    # Stats cards, recent users, audit feed
│   ├── Users.tsx                        # User CRUD table (no role/permission assignment)
│   ├── Roles.tsx                        # Role CRUD + module→route permission tree
│   ├── UserAccess.tsx                   # 3-section hub: roles, module access, route access
│   ├── Modules.tsx                      # Module CRUD + route management + permission binding
│   ├── ModulePage.tsx                   # Single module detail + route testing
│   ├── Tenants.tsx                      # Tenant CRUD
│   ├── Departments.tsx                  # Department CRUD (tenant-filtered)
│   ├── Designations.tsx                 # Designation CRUD (tenant-filtered)
│   ├── Sessions.tsx                     # Active session monitoring + revoke
│   ├── AuditLogs.tsx                    # Paginated audit trail
│   ├── AccessTester.tsx                 # Test all routes against current user's JWT
│   ├── UserProfileList.tsx              # User list for profile view (click row → profile)
│   └── UserProfile.tsx                  # Full user profile: info, roles, permissions, sessions, audit
│
├── components/
│   ├── ProtectedRoute.tsx               # Auth guard — checks localStorage session + expiry
│   ├── Layout.tsx                       # Sidebar + Header + Outlet
│   ├── Sidebar.tsx                      # Hardcoded nav groups (Main/Org/Monitoring) + dynamic Applications from GET /api/modules/accessible
│   ├── Header.tsx                       # Path-based title + "My Permissions" JWT decoder + profile dropdown with photo upload
│   ├── UserForm.tsx                     # Create/edit user form (no role multi-select)
│   ├── userFormModel.ts                 # Form state helpers
│   ├── Badge.tsx                        # Status/label chip
│   ├── RoleBadge.tsx                    # Role display badge (used in UserAccess)
│   ├── StatCard.tsx                     # Dashboard metric card
│   └── Skeleton.tsx                     # Loading placeholders
│
└── lib/
    ├── api.ts                           # Fetch wrapper (JWT attach, 401 redirect), all endpoint methods
    ├── auth.ts                          # getSession, saveSession, clearSession, getToken, getPermissions
    └── utils.ts                         # cn() — clsx + tailwind-merge, formatDateTime() — explicit en-US date formatting
```

---

## 3. Database Schema & Entity Relationships

### 3.1 Table Inventory (25 tables)

| # | Table | Entity | Domain | Extends BaseEntity |
|---|-------|--------|--------|-------------------|
| 1 | `auth_tenants` | Tenant | Tenancy | Yes |
| 2 | `auth_departments` | Department | Tenancy | Yes |
| 3 | `auth_designations` | Designation | Tenancy | Yes |
| 4 | `auth_tenant_users` | TenantUser | Tenancy (junction) | Yes |
| 5 | `auth_roles` | Role | Tenancy | Yes |
| 6 | `auth_role_claims` | RoleClaim | Tenancy | Yes |
| 7 | `auth_appusers` | AppUser | User | Yes |
| 8 | `auth_userroles` | UserRole | User (junction) | Yes |
| 9 | `UserClaims` | UserClaim | User | Yes |
| 10 | `auth_user_login_sessions` | UserLoginSession | User | Yes |
| 11 | `auth_token_blacklist` | TokenBlacklist | User | No |
| 12 | `auth_password_reset_tokens` | PasswordResetToken | User | No |
| 13 | `auth_otp_verifications` | OtpVerification | User | No |
| 14 | `auth_user_datatable_preferences` | UserDatatablePreference | User | No |
| 15 | `auth_permissions` | Permission | Auth | Yes |
| 16 | `auth_rolepermissions` | RolePermission | Auth (junction) | Yes |
| 17 | `auth_userpermissions` | UserPermission | Auth (junction) | Yes |
| 18 | `auth_modules` | Module | Navigation | Yes |
| 19 | `auth_pages` | Page | Navigation | Yes |
| 20 | `auth_module_permissions` | ModulePermission | Navigation (junction) | Yes |
| 21 | `auth_usermoduleaccesses` | UserModuleAccess | Navigation (junction) | Yes |
| 22 | `auth_userpageaccesses` | UserPageAccess | Navigation (junction) | Yes |
| 23 | `auth_api_service_routes` | ApiServiceRoute | API Routes | Yes |
| 24 | `auth_user_api_routes` | UserApiRoute | API Routes (junction) | Yes |
| 25 | `auth_audithistories` | AuditHistory | Audit | No |

### 3.2 Entity Relationship Diagram

```
auth_tenants
├──< auth_departments        (TenantId FK, Restrict)
├──< auth_designations       (TenantId FK, Restrict)
├──< auth_roles              (TenantId FK, Restrict)
├──< auth_tenant_users       (TenantId FK, Restrict)
└──< auth_audithistories     (TenantId FK, SetNull)

auth_departments ──< auth_appusers (DepartmentId FK, Restrict)
auth_designations ──< auth_appusers (DesignationId FK, Restrict)

auth_appusers
├──< auth_tenant_users       (AppUserId FK, Cascade)
├──< auth_userroles          (AppUserId FK, Cascade)
├──< auth_userpermissions    (AppUserId FK, Cascade)
├──< UserClaims              (AppUserId FK, Cascade)
├──< auth_user_login_sessions(AppUserId FK, Cascade)
├──< auth_token_blacklist    (AppUserId FK, SetNull)
├──< auth_password_reset_tokens  (AppUserId FK, Cascade)
├──< auth_otp_verifications  (AppUserId FK, Cascade)
├──< auth_user_datatable_preferences (AppUserId FK, Cascade)
├──< auth_usermoduleaccesses (AppUserId FK, Cascade)
├──< auth_userpageaccesses   (AppUserId FK, Cascade)
├──< auth_user_api_routes    (AppUserId FK, Cascade)
└──< auth_audithistories     (AppUserId FK, SetNull)

auth_roles
├──< auth_userroles          (RoleId FK, Cascade)
├──< auth_rolepermissions    (RoleId FK, Cascade)
└──< auth_role_claims        (RoleId FK, Cascade)

auth_permissions
├──< auth_rolepermissions    (PermissionId FK, Cascade)
├──< auth_userpermissions    (PermissionId FK, Cascade)
└──< auth_module_permissions (PermissionId FK, Cascade)

auth_modules (self-referencing via ParentId)
├──< auth_modules            (ParentId FK, Restrict)  [parent-child]
├──< auth_pages              (ModuleId FK, Cascade)
├──< auth_module_permissions (ModuleId FK, Cascade)
├──< auth_usermoduleaccesses (ModuleId FK, Cascade)
└──< auth_api_service_routes (ModuleId FK, Cascade)

auth_pages ──< auth_userpageaccesses (PageId FK, Cascade)
auth_api_service_routes ──< auth_user_api_routes (ApiServiceRouteId FK, Cascade)
```

### 3.3 Key Tables Detail

**`auth_api_service_routes`** — defines what permission is required for each backend endpoint:
| Column | Purpose |
|--------|---------|
| `ModuleId` (FK) | Parent module that owns this route |
| `HttpMethod` | GET, POST, PUT, PATCH, DELETE, or `*` for any |
| `RoutePattern` | URL pattern (supports `{param}` placeholders) |
| `RequiredPermissionCode` | String key matched against JWT `permission` claims |

**`auth_user_api_routes`** — per-user bypass of middleware permission checks:
| Column | Purpose |
|--------|---------|
| `AppUserId` (FK) | Target user |
| `ApiServiceRouteId` (FK) | Route to bypass |
| Effect: user can access this route **without** the required permission claim |

### 3.4 Delete Behaviors

- All junction tables: **CASCADE** delete
- Optional FKs to `Tenant`/`AppUser`: **RESTRICT** or **SET NULL**
- Module self-reference (`ParentId`): **RESTRICT** (prevents orphaned children)
- Audit references: **SET NULL** (preserves audit trail even if user/tenant deleted)

---

## 4. Three-Layer Access Control

The system uses 3 orthogonal layers. Access is the **union** of all layers (additive only — no deny/override in v1).

```
Layer 1: Role-Based Access ───────────────────────────────────────
  User → UserRole → Role → RolePermission → Permission.Code
  │
  │  Assigned via: User Access page (role checkboxes)
  │  Enforced via: JWT permission claims (set at login, checked by middleware)
  │  Modules via: ModulePermission junction (sidebar visibility)
  │
Layer 2: Direct Module Access ───────────────────────────────────
  User → UserModuleAccess → Module
  │
  │  Assigned via: User Access page (module checkboxes)
  │  Effect: module appears in sidebar & accessible endpoints
  │  Bypasses: role/permission requirements for module visibility
  │
Layer 3: Direct Route Grant ──────────────────────────────────────
  User → UserApiRoute → ApiServiceRoute
  │
  │  Assigned via: User Access page (route checkboxes)
  │  Enforced via: DynamicPermissionMiddleware (direct DB check before claims)
  │  Effect: middleware skips permission claim check for this route
  │
  ▼
Result: user gets MAX(role permissions, direct module access, direct route access)
```

### Access Resolution Order (GET /api/modules/accessible)

```
accessibleModuleIds =
    moduleIds from role permissions                         (Layer 1)
    ∪ moduleIds from direct UserModuleAccess grants          (Layer 2)
    ∪ moduleIds from direct UserApiRoute grants              (Layer 3)

result = all modules where:
    module has 0 ModulePermission entries → visible to ALL
    module has ≥1 ModulePermission entry → module.Id in accessibleModuleIds
```

### Access Resolution Order (DynamicPermissionMiddleware)

```
1. If route matches an ApiServiceRoute:
   a. Check UserApiRoute table for direct grant → ALLOW (skip to step 2)
   b. Check JWT claims for RequiredPermissionCode → ALLOW
   c. Neither found → 403 Forbidden
2. If route doesn't match any ApiServiceRoute → PASS THROUGH (no guard)
```

---

## 5. The Login Cycle

```
Browser (React)                .NET 8 API                    MySQL
─────────────                  ──────────                    ─────

Login.tsx
  ├─ email + password
  ▼
api.auth.login()
  │  POST /api/auth/login
  ▼                          AuthController.Login(req)
Vite proxy ────────────────►  │
  (:5173 → :5089)             │
                              ├─ [AllowAnonymous] (global auth bypass)
                              ├─ [EnableRateLimiting("login")] (10 req/min per IP)
                              │
                              ├─ Null check: IsNullOrWhiteSpace(email) || IsNullOrWhiteSpace(password)?
                              │    └─ YES → 401 "Invalid email or password."
                              │
                              ├─ NormalizedEmail = ToUpperInvariant(email)
                              │
                              ├─ SELECT * FROM auth_appusers
                              │    WHERE NormalizedEmail=@e
                              │    AND IsActive=1            ──► auth_appusers
                              │
                              ├─ user is null?
                              │    └─ YES → audit "Login Failed" (no EntityKey)
                              │            → SaveChanges → 401
                              │
                              ├─ [C1] IsLocked? (BEFORE bcrypt)
                              │    ├─ YES + LockoutEnd > UtcNow → 401 (still locked)
                              │    └─ YES + LockoutEnd <= UtcNow → [C2] Auto-unlock:
                              │         IsLocked = false, LockoutEnd = null, FailedLoginAttempts = 0
                              │
                              ├─ BCrypt.Verify(password, User.PasswordHash)
                              │    ├─ FAIL → FailedLoginAttempts++
                              │    │         if (FailedLoginAttempts >= 5)
                              │    │           IsLocked = true
                              │    │           LockoutEnd = UtcNow + 30 min
                              │    │         audit "Login Failed" (AppUserId set)
                              │    │         SaveChanges → 401
                              │    └─ PASS → continue
                              │
                              ├─ Load roles & permissions:
                              │    User → UserRoles → Role
                              │      → RolePermissions → Permission.Code  ──► auth_userroles
                              │                                                    auth_rolepermissions
                              │                                                    auth_permissions
                              │
                              ├─ permissions = user.UserRoles
                              │     .SelectMany(r => r.RolePermissions)
                              │     .Where(rp => rp.IsActive)
                              │     .Select(rp => rp.Permission.Code)
                              │     .Distinct()
                              │
                              ├─ Load direct permissions:
                              │    UserPermissions.Where(up => up.IsActive)
                              │      .Select(up => up.Permission.Code)
                              │    permissions.AddRange(directPerms)
                              │
                              ├─ BuildToken(userId, email, roles, permissions):
                              │    Claims:
                              │      sub        → userId
                              │      email      → user.Email
                              │      jti        → Guid.NewGuid()
                              │      role       → each role name
                              │      permission → each permission code
                              │
                              ├─ HMAC-SHA256 sign with Jwt:Key
                              │
                              │  ╔═══════════════════════════════════╗
                              │  ║  JWT Payload (decoded):          ║
                              │  ║  {                               ║
                              │  ║    "sub": "19",                  ║
                              │  ║    "email": "inv@test.com",     ║
                              │  ║    "role": ["Inventory Manager"],║
                              │  ║    "permission": [               ║
                              │  ║      "Inventory_FullAccess"     ║
                              │  ║    ]                            ║
                              │  ║  }                               ║
                              │  ╚═══════════════════════════════════╝
                              │
                              ├─ Reset user state:
                              │    FailedLoginAttempts = 0
                              │    LastLoginAt = UtcNow
                              │    UpdatedAt = UtcNow
                              │
                              ├─ Create UserLoginSession:
                              │    SessionId = Guid.NewGuid()
                              │    IpAddress, UserAgent, DeviceId = "web-" + sessionId[..8]
                              │    LoginAtUtc, LastSeenAtUtc, ExpiresAtUtc
                              │
                              ├─ Audit record: ActionType = "Login"
                              │
                              ├─ Single SaveChangesAsync()
                              │    (user state + session + audit in one round-trip)
                              │
                              ├─ Return { accessToken, expiresAt, user }
                              │
Browser ◄─────────────────────┘
  │
  │  Login.tsx:22-26:
  │    saveSession({
  │      token: res.accessToken,
  │      expiresAt: res.expiresAt,
  │      user: res.user,
  │    })
  │
  ▼
auth.ts: saveSession()
  ├─ localStorage.setItem("central_auth_session", JSON.stringify({
  │     token: "eyJhbGciOi...",
  │     expiresAt: "2026-06-12T16:00:00",
  │     user: { id: 19, fullName: "Inventory Tester", ... }
  │   }))
  ▼
navigate("/dashboard")
```

### JWT Claim Extraction (Frontend)

```typescript
// auth.ts — getPermissions()
const payload = session.token.split('.')[1];
const decoded = JSON.parse(atob(payload));
// returns decoded.permission (array of strings)
```

### Logout Flow (JWT Blacklist)

```
Header.tsx → "Sign Out"
  │
  ▼
api.auth.logout()
  │  POST /api/auth/logout
  ▼                          AuthController.Logout()
  │                          ├─ Extract JTI from JWT claims
  │                          ├─ Add JTI to auth_token_blacklist (C4)
  │                          │    TokenJti, AppUserId, ExpiresAt, Reason="Logout"
  │                          ├─ Audit record: ActionType = "Logout"
  │                          ├─ Deactivate all active sessions
  │                          └─ SaveChangesAsync()
  │
  ▼
auth.ts: clearSession()
  ├─ localStorage.removeItem("central_auth_session")
  ├─ clearAccessibleModulesCache()
  └─ navigate("/login")
```

---

## 6. Admin Configuration Flows

### 6a. Roles Page — Module→Route Tree

```
Roles.tsx (http://localhost:5173/roles)
  │
  ├── Left column: role cards (name, user count, permission count, color-coded)
  │
  └── Right column: detail panel when a role is selected
       │
       ├── Role info + permission coverage bar (X of Y permissions granted, %)
       │
       ├── Module Access (read-only tree):
       │   Modules (expandable) →
       │     └── Routes with checkmarks (green = granted, muted = not)
       │
       └── Edit button → opens modal with interactive module→route tree:
            Module name [Select All]
              ├─ ☐ [GET] /api/receipts
              ├─ ☑ [POST] /api/receipts
              └─ ☐ [DELETE] /api/receipts/{id}
```

**Key implementation details:**
- `allModuleNodes` (line ~163): built from `allModules.map()` — one node per module containing its permissions + routes
- `moduleNodes` (line ~160): filtered down to modules that have at least one permission or route (for read-only right panel)
- `permIdByCode` (line 151): `Object.fromEntries(allPermissions.map(p => [p.code, p.id]))` — maps permission codes to IDs for toggle
- HTTP method badges use `METHOD_COLORS` map for consistent coloring
- Coverage bar: `selectedIds.length / totalPerms` from RoleDetail + allPermissions

**Save flow (PUT /api/roles/{id}):**
```
selectedPerms = [id1, id2, ...]  ← from checked routes/permissions
PUT /api/roles/{id} {
  name, description, isActive,
  permissionIds: selectedPerms
}
Backend: hard-deletes active RolePermission rows (RemoveRange), inserts new ones — wrapped in transaction
```

### 6b. User Access Page — 3-Section Hub

```
UserAccess.tsx (http://localhost:5173/user-access)
  │
  ├── User Selector: searchable dropdown of up to 1000 users (click-outside closes dropdown)
  │
  ├── Section 1: Role Assignment (read-only badges — no inline editing)
  │     Super Admin | Inventory Manager | Viewer
  │     (displayed as RoleBadge components — assignment not edited here)
  │
  ├── Section 2: Direct Module Access (PUT /api/users/{id}/modules)
  │     ☑ Cutting
  │     ☐ Fabrics Receiving
  │     ☐ Inventory
  │
  ├── Section 3: Direct Route Access (PUT /api/users/{id}/routes)
  │     Cutting (expandable)
  │       ├─ ☑ [GET] /api/cutting
  │       └─ ☐ [POST] /api/cutting
  │     Fabrics Receiving (expandable)
  │       └─ ☐ [GET] /api/receipts
  │
  └── Save All button (bottom of page)
        → fires saveAll(): Promise.allSettled([saveRoles(), saveModules(), saveRoutes()])
        → per-section error/success display on partial failure
```

**Key implementation details:**
- `userRoleIds` is derived from `allRoles.filter(r => user.roles.includes(r.name))` — name-based matching
- `directModuleIds` / `directRouteIds` are fetched from dedicated endpoints (`GET /api/users/{id}/modules`, `GET /api/users/{id}/routes`)
- **Single "Save All" button** at bottom of page — no per-section save buttons
- Module expansion uses `m.id` for unique keys (not `m.name`)
- Routes by module: computed via `modules.map(m => ({ module: m, routes: allRoutes.filter(r => r.moduleId === m.id) }))`
- No inner scroll containers — page scrolls naturally
- `saveAll()` fires all three API calls in parallel via `Promise.allSettled`; partial failures show per-section errors
- `clearSectionError(section)` clears error state on toggle; `clearAllErrors()` resets on user change
- Roles are displayed as read-only badges — editing roles is not supported on this page

### 6c. Modules Page — Route Registration

```
Modules.tsx (http://localhost:5173/Modules)
  │
  ├── Data table: modules with columns [ID] [NAME] [ROUTE] [DESCRIPTION] [CREATED AT] [UPDATED AT] [STATUS] [ACTIONS]
  │   Actions: view (→ /apps/:id), edit, delete icons
  │
  ├── "Create New Module" form at top:
  │   Fields: Name* [required], Code* [required], Route* [required], Parent (optional), Status, Description
  │   Inline validation: blur-triggered — red border + "X is required" message when field is empty after touch
  │   States: formTouched tracks Name, Code, Route per field
  │
  ├── Edit Module modal:
  │   Same fields as create form
  │   Inline validation: same formTouched pattern — triggered on blur
  │
  └── Each module row has:
      [Manage Permissions 🔒] → modal: searchable permission checkboxes
      [▶ Routes (N)] → expand to show route table
        ├── Route rows: Method badge + Pattern + Permission + [Test] [Delete]
        │   Test: fetches route.routePattern directly (no /api prefix — patterns stored with full path)
        └── [+ Add Route] → modal: method, pattern, permission code (datalist), description
          Inline validation: routeFormTouched tracks Route Pattern, Required Permission Code — blur-triggered
```

**Route registration (POST /api/modules/{id}/routes):**
```json
{
  "httpMethod": "GET",
  "routePattern": "/api/inventory",
  "requiredPermissionCode": "Inventory_FullAccess"
}
```
- Creates row in `auth_api_service_routes`
- Invalidates `IMemoryCache` key `"DynamicPermissionRoutes"` (5-min sliding)
- Duplicate `(HttpMethod, RoutePattern)` returns 500 (DB unique index)

**Auto-generated permissions on module create:**
- When a module is created via `POST /api/modules`, 7 default permissions are auto-generated:
  ```
  {Code}_View, {Code}_Create, {Code}_Update, {Code}_Delete, {Code}_Export, {Code}_Import, {Code}_Print
  ```
  Example: Module `INV` → `INV_View`, `INV_Create`, `INV_Update`, `INV_Delete`, `INV_Export`, `INV_Import`, `INV_Print`
- Permissions are automatically linked to the module via `ModulePermission` junction records
- Permission codes are unique across the system (`auth_permissions.Code` has unique index)
- Idempotent: skips permissions that already exist (safe to call multiple times)
- Failure to generate permissions does NOT block module creation (try/catch)
- Seed endpoint: `POST /api/modules/seed-permissions` — retroactively creates permissions for all existing modules that lack them

**Inline validation pattern:**
```typescript
// formTouched: { name: false, code: false, route: false } — Create/Edit modal
// routeFormTouched: { routePattern: false, requiredPermissionCode: false } — Add Route modal
// onBlur handler: sets field touched → validation runs → red border + inline error message
// Submit handler: sets all fields touched → full validation pass → blocks submit if errors
```

---

## 7. Backend Middleware Guard

### Pipeline Order

```csharp
// Program.cs — global auth: all endpoints require JWT by default
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser().Build();
});

// C3: Rate limiting for login endpoint (10 req/min per IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});

app.UseAuthentication();                                // JWT → ClaimsPrincipal
app.UseAuthorization();                                 // Policy auth (default: RequireAuthenticatedUser)
app.UseRateLimiter();                                   // Rate limiting middleware
app.UseMiddleware<DynamicPermissionMiddleware>();        // Route-permission enforcement
app.MapControllers();                                   // Controller routing
// Public endpoints: [AllowAnonymous] on AuthController.Login, .AllowAnonymous() on /health
```

### DynamicPermissionMiddleware Flow

```
HTTP Request: GET /api/inventory
Authorization: Bearer eyJ...
  │
  ▼
DynamicPermissionMiddleware.InvokeAsync()
  │
  ├── Bypass check: path starts with /swagger, /health, /api/auth?
  │     (login uses [AllowAnonymous]; health uses .AllowAnonymous())
  │     ├── YES → await _next(context)
  │     └── NO  → continue
  │
  ├── GetCachedRoutesAsync()
  │     ├── Cache hit? (IMemoryCache, sliding 5 min)
  │     │     ├── YES → use cached list
  │     │     └── NO  → SELECT * FROM auth_api_service_routes
  │     │                 WHERE IsActive=1
  │     │                 → cache for 5 min
  │     │
  │     └── Routes include Id for direct-grant lookup
  │
  ├── MatchPattern(requestPath, requestMethod)
  │     ├── No match → await _next(context)  [no guard for this route]
  │     └── Match found → requiredCode = match.RequiredPermissionCode
  │
  ├── IsAuthenticated?
  │     ├── NO  → 401 { message: "Authentication required." }
  │     └── YES → continue
  │
  ├── Direct Route Grant Check (Layer 3)
  │     ├── Create new scope → query auth_user_api_routes
  │     │   AnyAsync(ur => ur.AppUserId == userId && ur.ApiServiceRouteId == match.Id)
  │     │
  │     ├── YES → await _next(context)  [bypass permission claim check]
  │     └── NO  → continue to claim check
  │
  ├── Claim Check (Layer 1)
  │     ├── user.HasClaim("permission", requiredCode)
  │     │
  │     ├── YES → await _next(context)  → 200 OK
  │     └── NO  → 403 Forbidden
  │               { message: "Insufficient permissions.",
  │                 requiredPermission: requiredCode }
  │
  ▼
Response to client
```

### Pattern Matching

```csharp
// Supports {param} placeholders:
//   Pattern: /api/inventory/{id}
//   Request: /api/inventory/42
//   Result:  Match (segments split by '/', {param} matches any value)
//
// HTTP method matching:
//   "*" pattern in DB matches any method
//   Otherwise exact match (case-insensitive)
```

### DynamicPermissionFilter (Redundant Safety Layer)

Applied via `[ServiceFilter(typeof(DynamicPermissionFilter))]` on `TestEndpointsController`. Same logic as middleware but runs as `IAsyncAuthorizationFilter` — provides defense-in-depth in case middleware is misconfigured or bypassed.

---

## 8. Client-Side Guards

### Guard Layers

| Layer | Location | What it guards | Trigger |
|-------|----------|---------------|---------|
| React Router | `ProtectedRoute.tsx` | All admin pages | Navigation (URL change) |
| API fetch wrapper | `api.ts:req()` | Backend API calls | 401 response from server |
| JWT expiry | `auth.ts:getSession()` | Session validity | `expiresAt` timestamp |
| Sidebar | `Sidebar.tsx` | Dynamic app links | `GET /api/modules/accessible` (5-min cache) |

### ProtectedRoute.tsx (7 lines)

```tsx
const session = getSession();
return session ? <Outlet /> : <Navigate to="/login" replace />;
```

Checks:
1. `localStorage.getItem("central_auth_session")` — null?
2. `JSON.parse()` — throws?
3. `new Date(s.expiresAt) < new Date()` — expired?
4. Any fail → `clearSession()` → redirect to `/login`

### API Layer Guard (api.ts:31-33)

```typescript
if (res.status === 401) {
  handleUnauthorized();  // clears session + redirects to /login
  throw new Error("Unauthorized");
}
```

### Sidebar Module Cache (Sidebar.tsx)

```
Mount → check localStorage("accessible_modules")
  ├── Cache hit + < 5 min old → use cached modules immediately
  └── Cache miss / expired → api.modules.accessible()
        → GET /api/modules/accessible
        → Cache result with current timestamp
        → Render "Applications" nav section
```

**`clearAccessibleModulesCache()`** — called after any role/permission/module/route save to force sidebar refresh.

---

## 9. Complete Data Flow

### End-to-End: Admin creates role → assigns user → user accesses route

```
── PHASE 1: ADMIN CONFIGURES ROLE ─────────────────────────────────

Roles.tsx                        POST /api/roles                 MySQL
[module→route tree]  ──────────► RolesController.Create()  ────► auth_roles
"Cutting.View" checked                                            auth_rolepermissions
permissionIds: [5]                                                auth_permissions


── PHASE 2: ADMIN ASSIGNS ROLE TO USER ───────────────────────────

UserAccess.tsx                   PUT /api/users/19/roles          MySQL
[select user 19]  ────────────► UsersController.UpdateRoles() ──► auth_userroles
☑ Inventory Manager                                              (hard replace:
{ roleIds: [5] }                                                   delete all, insert)


── PHASE 3: USER LOGS IN ─────────────────────────────────────────

Login.tsx                        POST /api/auth/login            MySQL
email + password  ─────────────► AuthController.Login()  ──────► auth_appusers
                                                                   auth_userroles
                                                                   auth_rolepermissions
                                                                   auth_permissions
  │
  ├─ permissions: ["Cutting.View"]
  ├─ JWT { sub: 19, permission: ["Cutting.View"] }
  └─ localStorage: central_auth_session


── PHASE 4: USER HITS PROTECTED ROUTE ────────────────────────────

fetch("GET /api/cutting")        DynamicPermissionMiddleware
Authorization: Bearer eyJ...
  │
  ├── Match → /api/cutting → RequiredPermissionCode = "Cutting.View"
  ├── Direct grant? → NO (not in auth_user_api_routes)
  ├── HasClaim("permission", "Cutting.View")? → YES
  ├── await _next(context)
  ▼
200 OK { module: "Cutting", status: "ok" }


── PHASE 5: USER WITHOUT PERMISSION HITS SAME ROUTE ──────────────

fetch("GET /api/cutting")        DynamicPermissionMiddleware
Authorization: Bearer eyJ...     (no Cutting.View claim)
  │
  ├── Match → /api/cutting → "Cutting.View"
  ├── Direct grant? → NO
  ├── HasClaim? → NO
  ▼
403 Forbidden { message: "Insufficient permissions.",
                requiredPermission: "Cutting.View" }
```

---

## 10. Key Design Decisions

### Why `Permission.Code` is a string (not FK) in ApiServiceRoute

`RequiredPermissionCode` on `ApiServiceRoute` is a string, not a FK to `auth_permissions`. This is intentional:
- Routes exist in downstream services that may not share the same DB
- Permission codes are stable identifiers that rarely change
- The middleware does a string claim match against the JWT — no DB join needed at runtime
- A `Permission` with matching Code must exist in the system for the UI to toggle it

### Why direct grants are additive (no deny in v1)

The access resolution order is **union** — role-derived permissions + direct module grants + direct route grants = effective permissions. There is no deny mechanism because:
- The original requirement was "just give this user access to module X regardless of role"
- Deny semantics would require a priority resolution algorithm (deny > grant, which layer wins?)
- Can be added as a future layer if needed

### Why RoleModule was removed

The old `auth_rolemodules` table directly bound roles to modules. This was redundant because:
- Module visibility is already determined by `ModulePermission` (module ↔ permission junction)
- A role grants permissions, and those permissions unlock modules
- Removing it simplified the data model and eliminated a source of inconsistency

### Why Roles page uses module→route tree (not grouped permissions)

The old UI showed permissions grouped by `GroupName` (e.g., "Modules", "HR Management"). The new tree shows:
- Top level: modules (matching `ModulePermission` structure)
- Expandable: routes within each module (matching `ApiServiceRoute` structure)
- This aligns with how the backend enforces access — modules = sidebar visibility, routes = endpoint access

### Why Permissions page was deleted

The permissions page was removed because:
- Permission definitions are created implicitly via the Roles page editing interface
- Managing permission codes directly was an unnecessary abstraction for admin users
- The Modules page still has a "Manage Permissions" modal for binding permissions to modules

### Why UserForm no longer has role assignment

Roles were removed from the Users page create/edit modal and moved to the User Access page because:
- User Access is the single hub for all user-specific access (roles, modules, routes)
- Users page is now purely for identity/profile data (name, email, department, designation)
- This separation follows the principle of single responsibility

### Why global authorization is enforced

All API endpoints require a valid JWT by default via `RequireAuthenticatedUser` policy in `Program.cs`. Public endpoints (login, health) opt out with `[AllowAnonymous]`. This means:
- No controller or action can accidentally be left unprotected
- New endpoints inherit auth protection automatically
- The middleware pipeline enforces authentication before any controller logic runs

## 11. Route Protection Matrix

For a user with role **"Inventory Manager"** (only `Inventory_FullAccess` permission):

### Mock Pages (client-side redirect engine)

| Page URL | fetch target | JWT has matching claim? | Result |
|----------|-------------|------------------------|--------|
| `/mock-apps/Inventory` | `/api/inventory` | ✅ `Inventory_FullAccess` | 200 ✅ |
| `/mock-apps/Fabrics` | `/api/fabrics` | ❌ `Fabrics_FullAccess` | 403 🔒 |
| `/mock-apps/Orders` | `/api/orders` | ❌ `Orders_FullAccess` | 403 🔒 |
| `/mock-apps/Reports` | `/api/reports` | ❌ `Reports_FullAccess` | 403 🔒 |
| `/mock-apps/FabricsReceiving/Receipts` | `/api/receipts` | ❌ `FabricsReceiving_Receipts_View` | 403 🔒 |
| `/mock-apps/Admin/Dashboard` | `/api/admin` | ❌ `Administration_FullAccess` | 403 🔒 |
| `/mock-apps/HR` | `/api/hr` | ❌ `HR_FullAccess` | 403 🔒 |

### React Admin Pages (client-side route guard)

| Route | ProtectedRoute | Notes |
|-------|---------------|-------|
| `/login` | ❌ No | Public — unauthenticated users can reach it; backend uses `[AllowAnonymous]` on global auth |
| `/dashboard` | ✅ Yes | Requires valid session |
| `/users` | ✅ Yes | Requires valid session |
| `/user-profiles` | ✅ Yes | User list for profile view |
| `/user-profiles/:id` | ✅ Yes | Full user profile detail |
| `/roles` | ✅ Yes | Requires valid session |
| `/user-access` | ✅ Yes | Requires valid session |
| `/Modules` | ✅ Yes | Capital M (matches file system) |
| `/tenants` | ✅ Yes | Requires valid session |
| `/departments` | ✅ Yes | Requires valid session |
| `/designations` | ✅ Yes | Requires valid session |
| `/sessions` | ✅ Yes | Requires valid session |
| `/audit` | ✅ Yes | Requires valid session |
| `/access-tester` | ✅ Yes | Requires valid session |
| `/apps/:moduleId` | ✅ Yes | Dynamic module pages |

> **Note:** ProtectedRoute only checks token existence + expiry. There is no frontend-side permission gating — all authorization enforcement is at the API level via DynamicPermissionMiddleware.

### Route Management via Modules UI

| Action | UI Location | API Endpoint | Effect |
|--------|------------|--------------|--------|
| List routes | Expand module chevron | `GET /api/modules/{id}/routes` | Shows routes table per module |
| Add route | Click "+ Add Route" | `POST /api/modules/{id}/routes` | Creates route, invalidates middleware cache |
| Update route | Edit route form | `PUT /api/modules/{id}/routes/{routeId}` | Updates route, invalidates cache |
| Delete route | Trash icon on route row | `DELETE /api/modules/{id}/routes/{routeId}` | Soft-deletes (IsActive=false), invalidates cache |

---

## 12. Security Measures

### Login Security (C1-C6 Fixes)

| Issue | Fix | Location |
|-------|-----|----------|
| **C1: Lockout after bcrypt** | Lockout check moved BEFORE bcrypt verification | `AuthController.cs:43-65` |
| **C2: Permanent lockout** | Auto-unlock when `LockoutEnd` expires; `FailedLoginAttempts` resets | `AuthController.cs:49-55` |
| **C3: No rate limiting** | Rate limiting: 10 login attempts per minute per IP | `Program.cs`, `AuthController.cs` |
| **C4: No token revocation** | JWT JTI added to `TokenBlacklists` on logout | `AuthController.cs:137-152` |
| **C5: Weak passwords** | Password policy: 8+ chars, max 128, 3 of 4 classes (upper/lower/digit/special) | `UsersController.cs:14-31` |
| **C6: Debug endpoint** | Debug `set-password` endpoint removed entirely | `AuthController.cs` |

### Password Policy

```
Minimum length:     8 characters
Maximum length:     128 characters (BCrypt truncates at 72)
Required classes:   3 of 4
                    ├─ Uppercase (A-Z)
                    ├─ Lowercase (a-z)
                    ├─ Digits (0-9)
                    └─ Special characters (!@#$%^&*)
```

### Rate Limiting

```
Policy:     "login"
Partition:  Per IP address
Limit:      10 requests per 1-minute window
Queue:      0 (reject immediately)
Response:   429 Too Many Requests
```

### Token Blacklist

```
On logout:
  1. Extract JTI from current JWT claims
  2. Add to auth_token_blacklist:
     - TokenJti: the JTI claim value
     - AppUserId: the user's ID
     - ExpiresAt: token expiry time
     - Reason: "Logout"
  3. Existing introspect/check-permission endpoints already check blacklist
```

### Session Management

```
Login:
  - Create UserLoginSession with SessionId, IpAddress, UserAgent
  - Set ExpiresAtUtc from JWT expiry

Logout:
  - Deactivate ALL active sessions for the user
  - Set EndedAtUtc, EndedReason = "Logout"

Lockout:
  - After 5 failed attempts: IsLocked = true, LockoutEnd = UtcNow + 30 min
  - Auto-unlock when LockoutEnd <= UtcNow
  - FailedLoginAttempts reset on successful login or auto-unlock
```

---

## 13. User Profile System

### Overview

The User Profile system provides a detailed view of any user's information, roles, permissions, sessions, and activity. It consists of two pages:

1. **UserProfileList** (`/user-profiles`) — Clickable user table
2. **UserProfile** (`/user-profiles/:id`) — Full profile detail

### Backend: GET /api/users/{id}/profile

Returns comprehensive user data in a single API call:

```csharp
UserProfileDto(
    // User info
    Id, FirstName, LastName, Email, UserName, PhoneNumber,
    EmployeeId, ProfilePhotoStorageKey, IsActive, IsLocked, TwoFactorEnabled,
    FailedLoginAttempts, LastLoginAt, CreatedAt, UpdatedAt,
    // Related
    TenantId, TenantName, DepartmentId, DepartmentName,
    DesignationId, DesignationName,
    // Aggregated
    Roles: List<RoleSummaryDto>,
    Permissions: List<PermissionSummaryDto>,  // role-based + direct, deduplicated
    ModuleAccesses: List<ModuleAccessSummaryDto>,
    RouteAccesses: List<RouteAccessSummaryDto>,
    Sessions: List<SessionSummaryDto>,        // last 10 active
    RecentAudit: List<AuditSummaryDto>        // last 10
)
```

**Data sources combined:**
- Role permissions: `UserRoles → Role → RolePermissions → Permission`
- Direct permissions: `UserPermissions → Permission`
- Module accesses: `UserModuleAccesses → Module`
- Route accesses: `UserApiRoutes → ApiServiceRoute`
- Sessions: `UserLoginSessions` (where `EndedAtUtc == null`)
- Audit: `AuditHistories` (where `AppUserId == id`)

### Frontend: UserProfileList.tsx

```
/user-profiles
  │
  ├── Header: "User Profile" title + subtitle
  ├── Search input + status filter (all/active/inactive/locked)
  │
  └── Table: clickable rows
      ├── Avatar (photo or initial)
      ├── Name + Email
      ├── Roles (badges, max 3 shown)
      ├── Department
      ├── Status badge
      ├── Last Login
      ├── Joined date
      └── "View →" link
```

### Frontend: UserProfile.tsx

```
/user-profiles/:id
  │
  ├── Header: Back button + Avatar + Name + Status badges (Active/Unlocked/2FA)
  │
  └── 2x2 Card Grid:
      ├── Personal Information
      │   Email, Username, Phone, Employee ID, Tenant, Department,
      │   Designation, Created, Updated, Last Login, Failed Attempts
      │
      ├── Roles & Permissions
      │   Roles (badges), Permissions (expandable, permission codes),
      │   Direct Module Access (badges), Direct Route Access (method + pattern)
      │
      ├── Active Sessions
      │   Last 10 active sessions: IP, User Agent, Login time
      │
      └── Recent Activity
          Last 10 audit entries: Action type (color-coded), Entity, Key, IP, Time
```

### Frontend Types (api.ts)

```typescript
interface UserProfile {
  id: number; firstName: string; lastName: string; email: string;
  userName: string; phoneNumber?: string | null;
  employeeId?: string | null; profilePhotoStorageKey?: string | null;
  isActive: boolean; isLocked: boolean; twoFactorEnabled: boolean;
  failedLoginAttempts: number; lastLoginAt?: string;
  createdAt: string; updatedAt?: string;
  tenantId?: number; tenantName?: string;
  departmentId?: number; departmentName?: string;
  designationId?: number; designationName?: string;
  roles: RoleSummary[];
  permissions: PermissionSummary[];
  moduleAccesses: ModuleAccessSummary[];
  routeAccesses: RouteAccessSummary[];
  sessions: SessionSummary[];
  recentAudit: AuditSummary[];
}

interface RoleSummary { id: number; name: string; description?: string; }
interface PermissionSummary { id: number; code: string; name: string; groupName?: string; }
interface ModuleAccessSummary { id: number; name: string; code: string; route: string; }
interface RouteAccessSummary { id: number; httpMethod: string; routePattern: string; requiredPermissionCode: string; }
interface SessionSummary { sessionId: string; ipAddress?: string; userAgent?: string; loginAtUtc: string; expiresAtUtc: string; isActive: boolean; }
interface AuditSummary { id: number; actionType: string; entityName: string; entityKey: string; ipAddress?: string; createdAt: string; }
```

### Sidebar Navigation

```
Main Group:
  ├── Dashboard
  ├── Users
  ├── User Profile        ← NEW
  ├── Roles & Permissions
  ├── Modules
  └── User Access
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `Central_auth_api/Controllers/UsersController.cs` | User CRUD, role/module/route assignment endpoints, profile endpoint, photo upload, password validation |
| `Central_auth_api/Controllers/RolesController.cs` | Role CRUD with permission sync |
| `Central_auth_api/Controllers/ModulesController.cs` | Module CRUD, accessible endpoint, nested route CRUD, auto-generate 7 default permissions on create |
| `Central_auth_api/Controllers/AuthController.cs` | Login (rate-limited), logout (JWT blacklist), introspect, check-permission |
| `Central_auth_api/Filters/DynamicPermissionMiddleware.cs` | Global route-permission enforcement + direct grant bypass |
| `Central_auth_api/Data/CentralAuthDbContext.cs` | DbContext with 25 DbSets and auto-audit |
| `Central_auth_api/DTOs/UserProfileDtos.cs` | UserProfileDto, RoleSummary, PermissionSummary, SessionSummary, AuditSummary |
| `Central_auth/src/pages/Roles.tsx` | Module→route permission tree (modal + read-only) |
| `Central_auth/src/pages/UserAccess.tsx` | 3-section hub — unified Save All, no scroll containers, single Save button at bottom |
| `Central_auth/src/pages/Modules.tsx` | Module CRUD, route management, inline form validation (formTouched states) |
| `Central_auth/src/pages/UserProfileList.tsx` | User list for profile view (click row → profile) |
| `Central_auth/src/pages/UserProfile.tsx` | Full user profile: info, roles, permissions, sessions, audit |
| `Central_auth/src/lib/api.ts` | All API endpoints, fetch wrapper with JWT + 401 redirect, FormData detection |
| `Central_auth/src/lib/auth.ts` | Session management, JWT decode, permission extraction |
| `Central_auth/src/lib/utils.ts` | `cn()` utility, `formatDateTime()` — explicit en-US date formatting |
