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

---

## 1. Project Overview

```
super-octo-engine-2/
├── Central_auth_api/          # .NET 8 Web API backend
│   ├── Controllers/           # 15 API controllers
│   ├── Models/                # 26 EF Core entities
│   ├── DTOs/                  # 15+ request/response DTOs
│   ├── Filters/               # DynamicPermissionMiddleware + Filter
│   ├── Data/                  # DbContext + Migrations (9)
│   ├── Services/              # EmployeeIdGenerator
│   └── Program.cs             # DI, middleware pipeline, CORS, Swagger
│
├── Central_auth/              # React 19 + Vite 8 frontend
│   ├── src/pages/             # 13 page components
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
| Auth | JWT Bearer, HMAC-SHA256, BCrypt | — |

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
│   ├── RoleDtos.cs                      # RoleListDto, RoleDetailDto, PermissionDto, Module DTOs
│   ├── RouteDtos.cs                     # RouteListItemDto, Create/Update DTOs
│   ├── TenantDtos.cs                    # Tenant CRUD DTOs
│   ├── DashboardDtos.cs                 # Stats, RecentUser, AuditActivity
│   └── PagedResult.cs                   # Generic paged result wrapper
│
├── Controllers/
│   ├── AuthController.cs                # POST /api/auth/login, logout, set-password, introspect, check-permission
│   ├── UsersController.cs               # GET/POST/PUT /api/users, roles/modules/routes endpoints, lock/unlock
│   ├── RolesController.cs               # CRUD /api/roles, soft-delete
│   ├── PermissionsController.cs         # CRUD /api/permissions, GET /groups
│   ├── ModulesController.cs             # CRUD /api/modules, accessible, pages, permissions, routes (nested)
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
├── pages/                              # 13 page components
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
│   └── AccessTester.tsx                 # Test all routes against current user's JWT
│
├── components/
│   ├── ProtectedRoute.tsx               # Auth guard — checks localStorage session + expiry
│   ├── Layout.tsx                       # Sidebar + Header + Outlet
│   ├── Sidebar.tsx                      # Nav links + dynamic Applications from GET /api/modules/accessible
│   ├── Header.tsx                       # Path-based title + "My Permissions" JWT decoder
│   ├── UserForm.tsx                     # Create/edit user form (no role multi-select)
│   ├── userFormModel.ts                 # Form state helpers
│   ├── Badge.tsx                        # Status/label chip
│   ├── StatCard.tsx                     # Dashboard metric card
│   └── Skeleton.tsx                     # Loading placeholders
│
└── lib/
    ├── api.ts                           # Fetch wrapper (JWT attach, 401 redirect), all endpoint methods
    ├── auth.ts                          # getSession, saveSession, clearSession, getToken, getPermissions
    └── utils.ts                         # cn() — clsx + tailwind-merge
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
                              ├─ NormalizedEmail = ToUpperInvariant(email)
                              │
                              ├─ SELECT * FROM auth_appusers
                              │    WHERE NormalizedEmail=@e
                              │    AND IsActive=1            ──► auth_appusers
                              │
                              ├─ BCrypt.Verify(password, User.PasswordHash)
                              │    ├─ FAIL → 401
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
Backend: deletes all RolePermission rows, inserts new ones
```

### 6b. User Access Page — 3-Section Hub

```
UserAccess.tsx (http://localhost:5173/user-access)
  │
  ├── User Selector: searchable dropdown of up to 100 users
  │
  ├── Section 1: Role Assignment (PUT /api/users/{id}/roles)
  │     ☑ Super Admin
  │     ☐ Inventory Manager
  │     ☐ HR Manager
  │     ☑ Viewer
  │     [Save Roles] → sends { roleIds: [1, 4] }
  │
  ├── Section 2: Direct Module Access (PUT /api/users/{id}/modules)
  │     ☑ Cutting
  │     ☐ Fabrics Receiving
  │     ☐ Inventory
  │     [Save Modules] → sends { moduleIds: [1] }
  │
  └── Section 3: Direct Route Access (PUT /api/users/{id}/routes)
       Cutting (expandable)
         ├─ ☑ [GET] /api/cutting
         └─ ☐ [POST] /api/cutting
       Fabrics Receiving (expandable)
         └─ ☐ [GET] /api/receipts
       [Save Routes] → sends { routeIds: [2, 5] }
```

**Key implementation details:**
- `userRoleIds` is derived from `allRoles.filter(r => user.roles.includes(r.name))` — name-based matching
- `directModuleIds` / `directRouteIds` are fetched from dedicated endpoints (`GET /api/users/{id}/modules`, `GET /api/users/{id}/routes`)
- Each section has independent `saving`/`error`/`success` state + its own Save button
- Module expansion uses `m.id` for unique keys (not `m.name`)
- Routes by module: computed via `modules.map(m => ({ module: m, routes: allRoutes.filter(r => r.moduleId === m.id) }))`

### 6c. Modules Page — Route Registration

```
Modules.tsx (http://localhost:5173/Modules)
  │
  ├── Tree table: parent modules with expandable children (parentId from DTO)
  │   Name / Code / Route / Status / Actions
  │     └── Children indented with "└─" prefix
  │
  ├── Each module row has:
  │   [Manage Permissions 🔒] → modal: searchable permission checkboxes
  │   [▶ Routes (N)] → expand to show route table
  │     ├── Route rows: Method badge + Pattern + Permission + [Test] [Delete]
  │     └── [+ Add Route] → modal: method, pattern, permission code (datalist), description
  │
  └── Search bar: filters by name or code (case-insensitive, real-time)
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

---

## 7. Backend Middleware Guard

### Pipeline Order

```csharp
// Program.cs
app.UseAuthentication();                                // JWT → ClaimsPrincipal
app.UseAuthorization();                                 // Policy auth
app.UseMiddleware<DynamicPermissionMiddleware>();        // Route-permission enforcement
app.MapControllers();                                   // Controller routing
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

---

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
| `/login` | ❌ No | Public — unauthenticated users can reach it |
| `/dashboard` | ✅ Yes | Requires valid session |
| `/users` | ✅ Yes | Requires valid session |
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

## Key Files Reference

| File | Purpose |
|------|---------|
| `Central_auth_api/Controllers/UsersController.cs` | User CRUD, role/module/route assignment endpoints |
| `Central_auth_api/Controllers/RolesController.cs` | Role CRUD with permission sync |
| `Central_auth_api/Controllers/ModulesController.cs` | Module CRUD, accessible endpoint, nested route CRUD |
| `Central_auth_api/Filters/DynamicPermissionMiddleware.cs` | Global route-permission enforcement + direct grant bypass |
| `Central_auth_api/Data/CentralAuthDbContext.cs` | DbContext with 25 DbSets and auto-audit |
| `Central_auth/src/pages/Roles.tsx` | Module→route permission tree (modal + read-only) |
| `Central_auth/src/pages/UserAccess.tsx` | 3-section access hub (roles, modules, routes) |
| `Central_auth/src/pages/Modules.tsx` | Module CRUD, route management, permission binding |
| `Central_auth/src/lib/api.ts` | All API endpoints, fetch wrapper with JWT + 401 redirect |
| `Central_auth/src/lib/auth.ts` | Session management, JWT decode, permission extraction |
