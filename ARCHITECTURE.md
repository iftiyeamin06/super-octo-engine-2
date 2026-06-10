# CentralAuth RBAC — Architecture Blueprint

Multi-tenant Role-Based Access Control system built with .NET 8 Web API + React + MySQL.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Database Schema](#2-database-schema)
3. [The Login Cycle](#3-the-login-cycle)
4. [The UI Configuration Flow](#4-the-ui-configuration-flow)
5. [The Backend Middleware Guard](#5-the-backend-middleware-guard)
6. [The Client-Side Route Guard](#6-the-client-side-route-guard)
7. [Complete Data Flow Diagram](#7-complete-data-flow-diagram)
8. [Route Protection Matrix](#8-route-protection-matrix)
9. [Verified Test Results](#9-verified-test-results)

---

## 1. Project Structure

```
super-octo-engine-2/
│
├── Central_auth_api/            ← .NET 8 Web API backend
│   ├── Controllers/             ← API endpoints
│   │   ├── AuthController.cs         → /api/auth/login
│   │   ├── RolesController.cs        → /api/roles
│   │   ├── UsersController.cs        → /api/users
│   │   ├── PermissionsController.cs  → /api/permissions
│   │   ├── ModulesController.cs      → /api/modules (CRUD + routes + permissions + accessible)
│   │   ├── TestEndpointsController.cs  → /api/receipts, /api/admin,
│   │   │                                  /api/fabrics, /api/orders,
│   │   │                                  /api/inventory, /api/reports
│   │   ├── MockAppController.cs       → HTML mock pages for RBAC testing
│   │   └── ...
│   ├── Models/                  ← EF Core entities
│   │   ├── AppUser.cs, Role.cs, Permission.cs, RolePermission.cs
│   │   ├── UserRole.cs, Tenant.cs, TenantUser.cs
│   │   ├── ApiServiceRoute.cs, ModulePermission.cs
│   │   ├── Module.cs, Page.cs, RoleModule.cs
│   │   └── ...
│   ├── Filters/
│   │   ├── DynamicPermissionFilter.cs    ← IAsyncAuthorizationFilter
│   │   └── DynamicPermissionMiddleware.cs ← Middleware
│   ├── Data/CentralAuthDbContext.cs
│   ├── Migrations/
│   └── Program.cs
│
├── Central_auth/                ← React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                  ← Router with ProtectedRoute wrapper
│   │   ├── pages/
│   │   │   ├── Login.tsx            ← Login form, saves session to localStorage
│   │   │   ├── Roles.tsx            ← Role CRUD with permission checkboxes
│   │   │   ├── Users.tsx            ← User CRUD with role assignment
│   │   │   ├── Permissions.tsx      ← Permission CRUD with create/delete
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Modules.tsx         ← Module CRUD, route management (add/edit/delete), permission assignment, search, tree
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx   ← Auth guard (checks localStorage)
│   │   │   ├── Sidebar.tsx         ← Admin nav (no Services link) + dynamic "Applications" section from accessible_modules
│   │   │   ├── Layout.tsx           ← Sidebar + Header + main
│   │   │   ├── UserForm.tsx         ← User create/edit form with role multi-select
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts               ← fetch wrapper, all endpoint functions, types (no services.*, added modules.routes.*)
│   │       ├── auth.ts              ← getSession, saveSession, clearSession, getToken
│   │       └── utils.ts             ← cn() for Tailwind class merging
│   └── vite.config.ts          ← Proxy /api/*, /auth/*, /mock-apps/* → http://127.0.0.1:5089
│
├── Schema/                      ← Database reference
├── Scripts/
└── ARCHITECTURE.md              ← This file
```

---

## 2. Database Schema

### Core RBAC Tables

```
auth_users
  ├── id (PK)
  ├── Email, NormalizedEmail
  ├── PasswordHash (BCrypt)
  ├── FirstName, LastName, UserName
  ├── IsActive, IsLocked
  └── ...

auth_roles
  ├── id (PK)
  ├── Name (unique per tenant)
  ├── Description
  ├── TenantId (nullable — global role if null)
  ├── IsSystem (protected from deletion)
  └── ...

auth_permissions
  ├── id (PK)
  ├── Code (unique, e.g. "Inventory_FullAccess")
  ├── Name (human-readable)
  ├── GroupName (logical grouping, e.g. "Modules")
  └── ...

auth_rolepermissions          ← Junction: Role → Permission (many-to-many)
  ├── RoleId (FK → auth_roles)
  ├── PermissionId (FK → auth_permissions)
  └── UNIQUE(RoleId, PermissionId)

auth_userroles                ← Junction: User → Role (many-to-many)
  ├── AppUserId (FK → auth_users)
  ├── RoleId (FK → auth_roles)
  └── UNIQUE(AppUserId, RoleId)

auth_tenants
  ├── id (PK)
  ├── Name, Code, ...
  └── ...

auth_tenantusers              ← Junction: User → Tenant
  ├── AppUserId (FK → auth_users)
  ├── TenantId (FK → auth_tenants)
  ├── EmployeeId (per-tenant serial)
  └── ...
```

### Route Protection Tables

```
auth_api_service_routes       ← Maps URL patterns to required permissions
  ├── id (PK)
  ├── ModuleId (FK → auth_modules)
  ├── HttpMethod (GET, POST, *, etc.)
  ├── RoutePattern (e.g. "/api/inventory")
  ├── RequiredPermissionCode (e.g. "Inventory_FullAccess")
  ├── IsActive (soft delete flag)
  └── ...
```

### Module Permission Tables

```
auth_module_permissions       ← Maps permissions to modules for sidebar visibility
  ├── id (PK)
  ├── ModuleId (FK → auth_modules)
  ├── PermissionId (FK → auth_permissions)
  ├── UNIQUE (ModuleId, PermissionId)
  └── ...
```

### Routes live on Modules (Services removed)

Routes are now attached directly to modules via `ModuleId` FK, removing the Services abstraction entirely. Each module can have zero or more API routes (`auth_api_service_routes`), and each route requires a permission code for middleware enforcement.

| Aspect | Modules (`auth_modules`) |
|--------|--------------------------|
| Purpose | Organizational labels + sidebar nav items + route containers |
| Used by | `DynamicPermissionMiddleware` at runtime + `Sidebar.tsx` "Applications" section + `Permissions.tsx` group dropdown |
| Connection to permissions | Routes have `RequiredPermissionCode` (string match for middleware); `auth_module_permissions` junction (direct FK for sidebar visibility) |

Modules with 0 permissions are visible to everyone.

### Entity Relationship Chain

```
auth_users
  └── auth_userroles (AppUserId → RoleId)
        └── auth_roles
              ├── auth_rolepermissions (RoleId → PermissionId)
              │     └── auth_permissions (Code = "Inventory_FullAccess")
              │           ├── auth_module_permissions (PermissionId → ModuleId)
              │           │     └── auth_modules
              │           └── auth_api_service_routes (RequiredPermissionCode string match)
              │                 └── auth_modules (ModuleId FK)
              └── auth_rolemodules (RoleId → ModuleId)

auth_api_service_routes (RoutePattern → RequiredPermissionCode, ModuleId FK → auth_modules)
  └── Routes are children of modules; permission matched by string Code at runtime

auth_module_permissions (ModuleId → PermissionId)
  └── Direct junction between modules and permissions for sidebar visibility
```

---

## 3. THE LOGIN CYCLE

```
 Browser (React)                     .NET 8 API                   MySQL
 ─────────────                     ──────────                   ─────

 Login.tsx
   │
   ├─ email + password
   │
   ▼
 api.auth.login()
   │
   │  fetch("POST /api/auth/login", {email, password})
   │
   ▼                          AuthController.Login(req)
 Vite proxy ─────────────────►  │
   (port 5173)                  │
                                ├─ ToUpperInvariant(email)
                                │
                                ├─ SELECT * FROM auth_users
                                │    WHERE NormalizedEmail=@e
                                │    AND IsActive=1         ──► auth_users
                                │    │
                                ├─ BCrypt.Verify(password, User.PasswordHash)
                                │    │
                                │    ├─ FAIL → 401 Unauthorized
                                │    └─ PASS → continue
                                │
                                ├─ Load UserRoles with eager includes:
                                │    User → UserRoles → Role
                                │      → RolePermissions → Permission.Code  ──► auth_userroles
                                │                                                       auth_rolepermissions
                                │                                                       auth_permissions
                                │    │
                                │    ├─ permissions = user.UserRoles
                                │    │     .SelectMany(r => r.RolePermissions)
                                │    │     .Where(rp => rp.IsActive)
                                │    │     .Select(rp => rp.Permission.Code)
                                │    │     .Distinct()
                                │    │     .ToList()
                                │    │
                                │    └─ roles = user.UserRoles
                                │          .Select(ur => ur.Role.Name)
                                │          .ToList()
                                │
                                ├─ BuildToken(userId, email, roles, permissions):
                                │    Claims:
                                │      sub        → userId
                                │      email      → user.Email
                                │      jti        → Guid.NewGuid()
                                │      role       → each role name
                                │      permission → each permission code  ←── KEY LINE
                                │
                                ├─ HMAC-SHA256 sign with Jwt:Key
                                │
                                │  ╔═══════════════════════════════════╗
                                │  ║  JWT Payload (decoded example):  ║
                                │  ║  {                                ║
                                │  ║    "sub": "19",                  ║
                                │  ║    "email": "inv@test.com",      ║
                                │  ║    "role": ["Inventory Manager"],║
                                │  ║    "permission": [               ║
                                │  ║      "Inventory_FullAccess"      ║
                                │  ║    ]                             ║
                                │  ║  }                                ║
                                │  ╚═══════════════════════════════════╝
                                │
                                ├─ Return { accessToken, expiresAt, user }
                                │
 Browser ◄──────────────────────┘
   │
   │  Login.tsx:22-26 (the mapper):
   │    saveSession({
   │      token: res.accessToken,    ←── accessToken → token rename
   │      expiresAt: res.expiresAt,
   │      user: res.user,
   │    })
   │
   ▼
 auth.ts: saveSession()
   │
   ├─ localStorage.setItem("central_auth_session", JSON.stringify({
   │     token: "eyJhbGciOi...",
   │     expiresAt: "2026-06-09T16:18:24",
   │     user: { id: 19, fullName: "Inventory Tester", ... }
   │   }))
   │
   ▼
 navigate("/dashboard")
```

### Key files:
- `Central_auth/src/pages/Login.tsx:22-26` — the `accessToken` → `token` mapper
- `Central_auth/src/lib/auth.ts:27-29` — `saveSession()` writes to localStorage
- `Central_auth_api/Controllers/AuthController.cs` — server-side login logic
- `Central_auth_api/Controllers/AuthController.cs:232-257` — `BuildToken()` with permission claims

---

## 4. THE UI CONFIGURATION FLOW

### 4a. Admin creates a role with specific permissions

```
 Admin's Browser                  React Roles.tsx               .NET 8 API              MySQL
 ───────────────                  ──────────────               ──────────              ─────

 Roles.tsx (http://localhost:5173/roles)
   │
   ├── Click "New Role"
   │
   ▼
 Create Modal opens
   │
   │  Name: "Inventory Manager"
   │  Description: "Handles inventory modules exclusively"
   │
   │  Permissions rendered from api.permissions.list()
   │  (fetched on mount via GET /api/permissions)
   │
   │   ┌─────────────────────────────────────────┐
   │   │ Modules                          ▲      │
   │   │  ☐ Fabric Receiving Full Access          │
   │   │  ☑ Inventory Full Access                 │  ←── only this checked
   │   │  ☐ Order Management Full Access          │
   │   │  ☐ Reports Full Access           ▼      │
   │   └─────────────────────────────────────────┘
   │
   │  selectedPerms = [11]  (Inventory_FullAccess permission ID)
   │
   ├── Click "Save"
   │
   ▼
 Roles.tsx:78
   await api.roles.create({
     name: "Inventory Manager",
     description: "...",
     permissionIds: [11],      ←── the checked IDs
   })
   │
   │  fetch("POST /api/roles", { name, permissionIds: [11] })
   │
   ▼                          RolesController.Create(dto)         auth_roles
 Vite proxy ─────────────────►  │
                                │  1. INSERT INTO auth_roles
                                │     (Name, Description, ...)         ──► INSERT
                                │     VALUES ("Inventory Manager", ...)
                                │
                                │  2. For each permissionId:
                                │     INSERT INTO auth_rolepermissions
                                │       (RoleId, PermissionId)          ──► INSERT
                                │       VALUES (@newRoleId, 11)
                                │
                                │  3. 201 Created { id: 5 }
                                │
```

### 4b. Admin creates a user and assigns the role

```
 Admin's Browser                  React Users.tsx               .NET 8 API              MySQL
 ───────────────                  ──────────────               ──────────              ─────

 Users.tsx
   │
   ├── Click "Create New User"
   │
   ▼
 UserForm.tsx opens
   │
   │  First Name: "Inventory"
   │  Last Name:  "Tester"
   │  Email:      "inv@test.com"
   │  Username:   "invtester"
   │  Password:   "Test@123"
   │  Tenant:     "Paragon" (tenant ID 1)
   │  Department: "HR" (department ID 5)
   │  Designation: "System Administrator" (designation ID 6)
   │  Roles:      [Inventory Manager]   ←── multi-select, role ID 5
   │
   ├── Click "Create User"
   │
   ▼
 Users.tsx:71
   await api.users.create({
     firstName, lastName, email, userName, password,
     tenantIds: [1], departmentId: 5, designationId: 6,
     roleIds: [5]                    ←── binds to Inventory Manager role
   })
   │
   │  fetch("POST /api/users", { ...roleIds: [5] })
   │
   ▼                          UsersController.Create(dto)          auth_users
 Vite proxy ─────────────────►  │
                                │  1. BCrypt.HashPassword("Test@123")
                                │
                                │  2. INSERT INTO auth_users
                                │     (FirstName, LastName, Email, ...)   ──► INSERT
                                │
                                │  3. Generate EmployeeId for tenant
                                │
                                │  4. INSERT INTO auth_tenantusers       ──► INSERT
                                │     (AppUserId, TenantId, EmployeeId)
                                │
                                │  5. INSERT INTO auth_userroles         ──► INSERT
                                │     (AppUserId, RoleId) VALUES (19, 5)
                                │
                                │  6. 201 Created { id: 19 }
                                │
```

### 4c. Admin registers API routes via Modules UI (Services removed)

Routes are now created directly on modules. The Modules page provides expandable route sections per module.

```
 Admin's Browser                  React Modules.tsx             .NET 8 API                   MySQL
 ───────────────                  ─────────────────            ──────────                   ─────

 Modules.tsx (http://localhost:5173/modules)
   │
   ├── Page loads → api.modules.list() + api.permissions.list()
   │
   ▼
 Module rows rendered, each with:
   ┌─ Cutting ─────────────────────────────────────────────┐
   │  Code: CUT  |  Route: /Cutting  |  Status: Active     │
   │                                                        │
   │  [Manage Permissions 🔒]  [▶ Routes (0)]               │  ← click chevron to expand
   └────────────────────────────────────────────────────────┘
   │
   ├── Click ▶ Routes (chevron)
   │    │
   │    ▼
   │  Routes table expanded (or "No routes registered")
   │    │
   │    ├── Click "+ Add Route"
   │    │    │
   │    │    ▼
   │    │  Route modal opens:
   │    │   ┌─ Add API Route ──────────────────────────────────────┐
   │    │   │  HTTP Method:      [GET ▾]                           │
   │    │   │  Route Pattern:    [/api/inventory                   │
   │    │   │  Permission Code:  [Inventory_FullAccess ▾]          │  ← datalist from api.permissions.list()
   │    │   │  [Cancel]  [Add Route]                               │
   │    │   └──────────────────────────────────────────────────────┘
   │    │    │
   │    │    ├── Fill form, click "Add Route"
   │    │    │
   │    │    ▼
   │    │  api.modules.routes.create(moduleId, payload) ──►  POST /api/modules/{id}/routes  ──► INSERT
   │    │    │  { httpMethod: "GET",                         ModulesController.AddRoute()        auth_api_service_routes
   │    │    │    routePattern: "/api/inventory",
   │    │    │    requiredPermissionCode: "Inventory_FullAccess" }
   │    │    │
   │    │    ├── 201 Created { id: N }
   │    │    ├── Cache invalidated (InvalidateCache() removes DynamicPermissionRoutes key)
   │    │    └── UI refreshes route list for that module
   │    │
   │    └── Deleting a route:
   │         Click trash icon → api.modules.routes.remove(moduleId, id)
   │           ──►  DELETE /api/modules/{id}/routes/{routeId}  ──► soft delete (IsActive=false)
   │           → Cache invalidated
   │           → UI refreshes
   │
   ▼
  Result: auth_api_service_routes now has row:
   ┌────┬──────────┬────────┬─────────────────┬────────────────────────────┐
   │ Id │ ModuleId │ Method │ RoutePattern     │ RequiredPermissionCode     │
   ├────┼──────────┼────────┼─────────────────┼────────────────────────────┤
   │ 15 │ 1        │ GET    │ /api/inventory   │ Inventory_FullAccess       │
   └────┴──────────┴────────┴─────────────────┴────────────────────────────┘
```

> **Note:** `CreateRoute` and `UpdateRoute` both validate `HttpMethod`, `RoutePattern`, and `RequiredPermissionCode` are non-null before use (returns 400 BadRequest if missing). The DB has a unique index on `(HttpMethod, RoutePattern)` — attempting to register a duplicate HTTP+path combination returns 500.

### Key files for route management UI:
- `Central_auth/src/pages/Modules.tsx` — expandable route sections + route modal + Manage Permissions
- `Central_auth/src/lib/api.ts` — `api.modules.routes.*` CRUD functions + `ModuleRouteItem` types
- `Central_auth_api/Controllers/ModulesController.cs` — endpoints: `GET|POST|PUT|DELETE /{id}/routes`
- `Central_auth_api/Models/ApiServiceRoute.cs` — entity model (ModuleId FK, no more ServiceId)
- `Central_auth/vite.config.ts` — proxies `/api/*` to backend

### 4d. Admin browses and manages modules with search, tree view, and delete

`ModuleListItemDto` now includes `ParentId` (nullable long), enabling the frontend to build a hierarchical tree from the flat list response.

```
 Modules.tsx (http://localhost:5173/Modules)
   │
   ├── Page loads → api.modules.list()
   │
   ▼
 ┌──────────────────────────────────────────────────────┐
 │ [🔍 Search modules by name or code...]               │  ← search bar
 ├──────────────────────────────────────────────────────┤
 │ Name          Code   Route      Status   Actions     │
 ├──────────────────────────────────────────────────────┤
 │ 📦 Accounts   ACC   /security  Active   ✏️  🗑️      │  ← parent row
 │   └─ 📦 ...   ...   ...        ...      ...          │  ← child (indented, parentId != null)
 │ 📦 Cutting    CUT   /Cutting   Active   ✏️  🗑️      │
 │ 📦 Fabric     FAB   /hrm       Active   ✏️  🗑️      │
 └──────────────────────────────────────────────────────┘
   │
   ├── Search bar: filters by name OR code (case-insensitive, real-time)
   │
   ├── Tree view: Modules with parentId=null are top-level.
   │   Children render indented with "└─" prefix.
   │   Sorted alphabetically within each level.
   │
   ├── Edit (✏️): Opens create/edit modal pre-filled with module data
   │
   └── Delete (🗑️): Inline confirmation "Delete?" [Yes] [No]
       → api.modules.remove(id) → DELETE /api/modules/{id}
       → Backend soft-deletes (IsActive=false, UpdatedAt=UtcNow)
       → UI refreshes list
```

### Key files for Modules page:
- `Central_auth/src/pages/Modules.tsx` — search bar, tree rendering (parentId from DTO), delete confirmation, Manage Permissions modal
- `Central_auth/src/lib/api.ts` — `api.modules.remove(id)`, `api.modules.permissions(id)`, `api.modules.updatePermissions(id, ids)` functions
- `Central_auth_api/Controllers/ModulesController.cs` — `GET /api/modules/accessible`, `GET|PUT /api/modules/{id}/permissions`
- `Central_auth_api/DTOs/RoleDtos.cs` — `ModuleListItemDto` record includes `ParentId`

### 4e. Admin assigns permissions to modules (Module ↔ Permission junction)

```
 Modules.tsx → click shield icon on a module row
   │
   ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  Manage Permissions — Cutting                                  │
 │  ┌──────────────────────────────────────────────────────────┐  │
 │  │ [🔍 Search permissions by name or code...]              │  │  ← search bar
 │  └──────────────────────────────────────────────────────────┘  │
 │  ┌──────────────────────────────────────────────────────────┐  │
 │  │ ☑ Inventory_ReadAccess    Inventory Read Access         │  │
 │  │ ☐ Inventory_WriteAccess   Inventory Write Access        │  │
 │  │ ☑ HR_FullAccess           HR Full Access                │  │
 │  │ ...                                                      │  │
 │  └──────────────────────────────────────────────────────────┘  │
 │  │  2 selected                        [Cancel] [Save]         │
 └────────────────────────────────────────────────────────────────┘
   │
   ├── Modal loads: fetch all permissions + current module's assigned permission IDs
   │     api.permissions.list()  +  api.modules.permissions(id)
   │
   ├── User checks/unchecks permissions, clicks Save
   │     → api.modules.updatePermissions(id, [ids])
   │     → PUT /api/modules/{id}/permissions { permissionIds: [...] }
   │
   ├── Backend: deletes all existing ModulePermission rows for that module, inserts new ones
   │     db.ModulePermissions.RemoveRange(module.ModulePermissions)
   │     db.ModulePermissions.AddRange(new entries)
   │
   └── Result: auth_module_permissions now reflects the assignment
         ┌────┬──────────┬──────────────┐
         │ Id │ ModuleId │ PermissionId │
         ├────┼──────────┼──────────────┤
         │ 1  │ 1        │ 13           │
         │ 2  │ 1        │ 5            │
         └────┴──────────┴──────────────┘
```

### Sidebar consumption — `GET /api/modules/accessible`

```
 Sidebar.tsx
   │
   ├── Mount → check localStorage("accessible_modules") cache (5 min TTL)
   │
   ├── Cache miss → api.modules.accessible()
   │     → GET /api/modules/accessible
   │     → Backend:
   │        1. Get user's permission IDs from UserRoles → RolePermissions
   │        2. Find modules where:
   │           - Module has 0 ModulePermissions → visible to all
   │           OR
   │           - Module has ≥1 ModulePermission matching user's permission IDs
   │        3. Sort by SortOrder → Name
   │        4. Return ModuleAccessibleDto[]
   │
   ├── Cache hit → use cached modules immediately (no flicker)
   │
   └── Render "Applications" section in sidebar nav
         ┌─ Applications ─────────────────────────┐
         │  📦 Cutting        (href="/Cutting")   │
         │  📦 Accounts       (href="/security")  │
         │  ...                                   │
         └────────────────────────────────────────┘
```

### Behavior rules:
- **Module with 0 permissions assigned** → visible to **all** authenticated users (default-open)
- **Module with ≥1 permission assigned** → visible **only** to users whose roles include at least one matching permission
- **Cache key**: `accessible_modules` with shape `{ modules: ModuleAccessible[], fetchedAt: number }`
- **Cache TTL**: 5 minutes; survives page refresh; re-fetches on expiry
- **Middleware is unaffected**: Sidebar is UX-only; backend still enforces per-route access via `DynamicPermissionMiddleware`

### Resulting MySQL relationship chain:

```
auth_users (id=19)
  └── auth_userroles (AppUserId=19, RoleId=5)
        └── auth_roles (id=5, Name="Inventory Manager")
              └── auth_rolepermissions (RoleId=5, PermissionId=11)
                    └── auth_permissions (id=11, Code="Inventory_FullAccess")
```

---

## 5. THE BACKEND MIDDLEWARE GUARD

When a request hits the .NET API, `DynamicPermissionMiddleware` intercepts it before it reaches the controller.

```
 HTTP Request                         DynamicPermissionMiddleware
 ────────────                         ──────────────────────────
                                           │
 fetch("/api/inventory")                   │
 Authorization: Bearer eyJ...              │
   │                                       │
   ▼                                       │
 Program.cs pipeline                       │
   │                                       │
   ├─ app.UseAuthentication()  → JWT decoded, ClaimsPrincipal built
   ├─ app.UseAuthorization()
   ├─ app.UseMiddleware<DynamicPermissionMiddleware>()
   │                                       │
   │                                       ├─ path = "/api/inventory"
   │                                       ├─ method = "GET"
   │                                       │
   │                                       ├─ BypassPrefixes check:
   │                                       │    ("/swagger", "/health", "/api/auth")
   │                                       │    → No match, continue
   │                                       │
   │                                       ├─ GetCachedRoutesAsync()
   │                                       │    │
   │                                       │    ├─ Cache hit? (IMemoryCache, 5 min sliding)
   │                                       │    │   ├─ YES → use cached list
   │                                       │    │   └─ NO  → SELECT *             ──► auth_api_service_routes
   │                                       │    │             FROM auth_api_service_routes
   │                                       │    │             WHERE IsActive=1
   │                                       │    │             → cache for 5 min
   │                                       │    │
   │                                       │    ▼
   │                                       │    Routes loaded:
   │                                       │    ┌─────────────────────┬─────┬─────────────────────────┐
   │                                       │    │ RoutePattern        │Method│ RequiredPermissionCode │
   │                                       │    ├─────────────────────┼─────┼─────────────────────────┤
   │                                       │    │ /api/receipts       │ GET │ FabricsReceiving_...    │
   │                                       │    │ /api/admin          │ GET │ Administration_FullAccess│
   │                                       │    │ /api/fabrics        │ GET │ Fabrics_FullAccess      │
   │                                       │    │ /api/orders         │ GET │ Orders_FullAccess       │
   │                                       │    │ /api/inventory      │ GET │ Inventory_FullAccess    │
   │                                       │    │ /api/reports        │ GET │ Reports_FullAccess      │
   │                                       │    └─────────────────────┴─────┴─────────────────────────┘
   │                                       │
   │                                       ├─ MatchPattern("/api/inventory", "/api/inventory")
   │                                       │    → Match found!
   │                                       │    → requiredCode = "Inventory_FullAccess"
   │                                       │
   │                                       ├─ user.Identity?.IsAuthenticated?
   │                                       │    │
   │                                       │    ├─ NO  → 401 { message: "Authentication required." }
   │                                       │    │          Return early
   │                                       │    │
   │                                       │    └─ YES → continue
   │                                       │
   │                                       ├─ user.HasClaim("permission", "Inventory_FullAccess")
   │                                       │    │
   │                                       │    │  Checks the JWT claims that were decoded
   │                                       │    │  by Authentication middleware earlier:
   │                                       │    │
   │                                       │    │  JWT Payload:
   │                                       │    │  {
   │                                       │    │    "permission": [
   │                                       │    │      "Inventory_FullAccess"    ←── exists!
   │                                       │    │    ]
   │                                       │    │  }
   │                                       │    │
   │                                       │    ├─ Claim FOUND
   │                                       │    │    → await _next(context)
   │                                       │    │    → passes to controller
   │                                       │    │    → TestEndpointsController.GetInventory()
   │                                       │    │    → 200 OK { module: "Inventory", status: "ok" }
   │                                       │    │
   │                                       │    └─ Claim NOT FOUND
   │                                       │         → 403 Forbidden
   │                                       │         → { message: "Insufficient permissions.",
   │                                       │             requiredPermission: "Inventory_FullAccess" }
   │                                       │
   ▼                                       ▼
  Response                                Response
```

### Key code:

**`DynamicPermissionMiddleware.cs:57-69`** — the critical enforcement:
```csharp
var hasPermission = user.HasClaim(c =>
    c.Type == "permission" && c.Value == match.RequiredPermissionCode);

if (!hasPermission)
{
    context.Response.StatusCode = 403;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsync(JsonSerializer.Serialize(new
    {
        message = "Insufficient permissions.",
        requiredPermission = match.RequiredPermissionCode
    }));
    return;
}

await _next(context);
```

**`DynamicPermissionFilter.cs:56-69`** — identical logic as `IAsyncAuthorizationFilter` (redundant safety layer).

---

## 6. THE CLIENT-SIDE ROUTE GUARD

```
 Browser navigation                  React Router                   localStorage
 ──────────────                      ────────────                   ────────────

 User types URL or clicks sidebar link
   │
   ▼
 <BrowserRouter> in App.tsx
   │
   ├── Path: "/login"
   │   └── <Route path="/login" element={<Login />} />
   │        → No guard — everyone can reach login
   │
    ├── Path: "/dashboard", "/roles", "/users", "/modules", etc.
   │   │
   │   ▼
   │   <ProtectedRoute />
   │   │
   │   ├── ProtectedRoute.tsx:5
   │   │   const session = getSession();
   │   │   return session ? <Outlet /> : <Navigate to="/login" replace />;
   │   │
   │   │   getSession() in auth.ts:
   │   │     ├─ localStorage.getItem("central_auth_session")
   │   │     ├─ if null → return null
   │   │     ├─ JSON.parse(raw)
   │   │     ├─ new Date(s.expiresAt) < new Date()?
   │   │     │    ├─ YES → clearSession(), return null
   │   │     │    └─ NO  → return { token, expiresAt, user }
   │   │     └─ catch error → return null
   │   │
   │   ├── Session null?
   │   │    ├─ YES → <Navigate to="/login" replace />
   │   │    └─ NO  → <Outlet />
   │   │             │
   │   │             ▼
   │   │         <Layout />
   │   │           ├── <Sidebar />  (navigation links)
   │   │           ├── <Header />   (user info, logout)
   │   │           └── <Outlet />   (page content)
   │   │
   │   └── Also: API layer guard in api.ts:31-33
   │        If any API call returns 401:
   │          clearSession() + redirect to /login
   │
   └── Path: anything else
       └── <Navigate to="/dashboard" replace />
```

### Guard layers summary:

| Layer | Location | What it guards | Trigger |
|---|---|---|---|
| React Router | `ProtectedRoute.tsx` | All admin pages | Navigation (URL change) |
| API fetch wrapper | `api.ts:31-33` | Backend API calls | 401 response from server |
| JWT expiry | `auth.ts:22` | Session validity | `expiresAt` timestamp |

---

## 7. COMPLETE DATA FLOW DIAGRAM

```
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │                            FULL RBAC DATA FLOW                                        │
 └──────────────────────────────────────────────────────────────────────────────────────┘

 ──── PHASE 2 ──── ADMIN CONFIGURES PERMISSIONS VIA REACT UI ───────────────────────────

  Roles.tsx                              POST /api/roles                     MySQL
  [checkboxes]  ──────────────────────►  RolesController.Create()  ──────►  auth_roles
  "Inventory_FullAccess" checked                                              auth_rolepermissions
  permissionIds: [11]                                                         auth_permissions

 ──── PHASE 1 ──── USER LOGS IN, JWT GENERATED ─────────────────────────────────────────

  Login.tsx                              POST /api/auth/login               MySQL
  email + password  ──────────────────►  AuthController.Login()  ────────►  auth_users (verify)
                       │                                                     auth_userroles (load)
                       │                                                     auth_rolepermissions (load)
                       │                                                     auth_permissions (load codes)
                       ▼
                  JWT built with claims:
                   permission: ["Inventory_FullAccess"]
                       │
                       ▼
                  Response: { accessToken, expiresAt, user }
                       │
                       ▼
                  Login.tsx:23
                  saveSession({ token: res.accessToken, ... })
                       │
                       ▼
                  localStorage.setItem("central_auth_session", JSON.stringify({...}))

 ──── PHASE 4 ──── CLIENT-SIDE NAVIGATION GUARD ────────────────────────────────────────

  Browser URL change
       │
       ▼
  ProtectedRoute.tsx:5
  getSession()  ──►  localStorage.getItem("central_auth_session")
       │
       ├── null/expired → Navigate to /login
       └── valid → Outlet (render page)

 ──── PHASE 3 ──── MOCK PAGE CHECKS PERMISSION VIA BACKEND ─────────────────────────────

  MockAppController                       fetch("/api/inventory")           DynamicPermissionMiddleware
  (browser HTML/JS)  ──────────────────►  Bearer token attached  ──────────►
       │                                                                     │
       │  window.onload()                                                    ├─ Match route pattern?
       │  localStorage.getItem(                                              │    /api/inventory → Inventory_FullAccess
       │    "central_auth_session")                                          │
       │  → JSON.parse → session.token                                      ├─ HasClaim("permission",
       │  → fetch("/api/inventory", {                                       │    "Inventory_FullAccess")?
       │      Authorization: "Bearer eyJ..." })                              │    │
       │                                                                    │    ├─ YES → 200 OK
       │                                                                    │    └─ NO  → 403 Forbidden
       │                                                                    │
       ▼                                                                    ▼
  JS handles response:
  200 → "✅ Access Granted!"
  401 → alert + redirect to /swagger
  403 → alert + redirect to /swagger

  ──── PHASE 5 ──── REGISTER API ROUTES VIA MODULES UI ────────────────────────────────────

   Modules.tsx
   [expand module section]               api.modules.routes          ModulesController        MySQL
     │                                         .list(moduleId)         GET /api/modules/{id}/routes
     ├──► routes displayed ◄─────────────────────────────────────────────────────────────── auth_api_service_routes
     │
     ├──► Click "+ Add Route"
     │      │
     │      │  httpMethod: "GET"
     │      │  routePattern: "/api/inventory"
     │      │  requiredPermissionCode: "Inventory_FullAccess"
     │      │
     │      ▼
     │   api.modules.routes              POST /api/modules/{id}/routes   AddRoute()
     │     .create(moduleId,             ─────────────────►  │                              │
     │       payload)                                         │  1. Validate required fields  │
     │                                                        │  2. INSERT INTO               │
     │                                                        │     auth_api_service_routes  ──► INSERT
     │                                                        │  3. InvalidateCache()        │
     │                                                        │     (IMemoryCache reset)     │
     │                                                        └── 201 Created                │
     │                                                                                        │
     └──► UI refreshes route list (re-fetches api.modules.routes.list(moduleId))

  ──── AWAIT RESPONSE ────────────────────────────────────────────────────────────────────

  /mock-apps/Inventory   →  fetch /api/inventory   →  200 ✅ Access Granted
  /mock-apps/Fabrics     →  fetch /api/fabrics     →  403 🔒 Redirect to /swagger
  /mock-apps/Orders      →  fetch /api/orders      →  403 🔒 Redirect to /swagger
  /mock-apps/Reports     →  fetch /api/reports     →  403 🔒 Redirect to /swagger
  /mock-apps/FabricsReceiving/Receipts  →  fetch /api/receipts  →  403 🔒 Redirect
  /mock-apps/Admin/Dashboard            →  fetch /api/admin     →  403 🔒 Redirect
```

---

## 8. ROUTE PROTECTION MATRIX

For a user with role **"Inventory Manager"** (only `Inventory_FullAccess` permission):

### 8a. Mock pages (client-side redirect engine)

| Page URL | fetch target | JWT has matching claim? | Result |
|---|---|---|---|
| `/mock-apps/Inventory` | `/api/inventory` | ✅ `Inventory_FullAccess` | 200 ✅ |
| `/mock-apps/Fabrics` | `/api/fabrics` | ❌ `Fabrics_FullAccess` | 403 🔒 |
| `/mock-apps/Orders` | `/api/orders` | ❌ `Orders_FullAccess` | 403 🔒 |
| `/mock-apps/Reports` | `/api/reports` | ❌ `Reports_FullAccess` | 403 🔒 |
| `/mock-apps/FabricsReceiving/Receipts` | `/api/receipts` | ❌ `FabricsReceiving_Receipts_View` | 403 🔒 |
| `/mock-apps/Admin/Dashboard` | `/api/admin` | ❌ `Administration_FullAccess` | 403 🔒 |
| `/mock-apps/HR` | `/api/hr` | ❌ (no `HR_FullAccess`) | 403 🔒 |

### 8b. React admin pages (client-side route guard)

| Route | ProtectedRoute | Notes |
|---|---|---|
| `/login` | ❌ No | Public — unauthenticated users can reach it |
| `/dashboard` | ✅ Yes | Requires valid session in localStorage |
| `/roles` | ✅ Yes | Requires valid session |
| `/users` | ✅ Yes | Requires valid session |
| `/permissions` | ✅ Yes | Requires valid session |
| `/modules` | ✅ Yes | Requires valid session |
| `/tenants` | ✅ Yes | Requires valid session |
| `/sessions` | ✅ Yes | Requires valid session |
| `/audit` | ✅ Yes | Requires valid session |

> **Note:** The `ProtectedRoute` only checks for token **existence + expiry**. It does NOT check permission claims. Permission-based feature gating within admin pages would need additional logic (e.g., checking specific claims on the JWT payload).

### 8c. Route management via Modules UI

| Action | UI Location | API Endpoint | Effect |
|--------|------------|--------------|--------|
| List routes | Expand module chevron | `GET /api/modules/{id}/routes` | Shows routes table per module |
| Add route | Click "+ Add Route" in expanded section | `POST /api/modules/{id}/routes` | Creates route, invalidates middleware cache |
| Delete route | Click trash icon on route row | `DELETE /api/modules/{id}/routes/{routeId}` | Soft-deletes (IsActive=false), invalidates cache |

---

---

## 9. Verified Test Results

Full end-to-end test run on `iftiyeamin06@gmail.com` (roles: Super Admin, HR Manager; permissions: `HR_FullAccess`, `user.*`, `role.*`):

| # | Action | Result |
|---|--------|--------|
| 1 | `POST /api/auth/login` | **200** — JWT contains `HR_FullAccess` permission claim |
| 2 | `GET /api/modules` | **200** — 5 modules returned with `parentId` (tree hierarchy works) |
| 3 | `POST /api/modules/7/routes` → `/api/hr` → `HR_FullAccess` | **201** — Route created |
| 4 | `POST /api/modules/6/routes` → `/api/fabrics` → `Fabrics_FullAccess` | **201** — Route created |
| 5 | `POST /api/modules/8/routes` → `/api/inventory` → `Inventory_FullAccess` | **201** — Route created |
| 6 | `POST /api/modules/6/routes` → `/api/orders` → `Orders_FullAccess` | **201** — Route created |
| 7 | `POST /api/modules/6/routes` → `/api/reports` → `Reports_FullAccess` | **201** — Route created |
| 8 | `POST /api/modules/6/routes` → `/api/receipts` → `FabricsReceiving_Receipts_View` | **201** — Route created |
| 9 | `POST /api/modules/6/routes` → `/api/admin` → `Administration_FullAccess` | **201** — Route created |
| 10 | `GET /api/hr` (has `HR_FullAccess`) | **200** — `{"module":"HR","status":"ok"}` |
| 11 | `GET /api/fabrics` (no `Fabrics_FullAccess`) | **403** — Forbidden |
| 12 | `GET /api/inventory` (no `Inventory_FullAccess`) | **403** — Forbidden |
| 13 | `GET /api/orders` (no `Orders_FullAccess`) | **403** — Forbidden |
| 14 | `GET /api/reports` (no `Reports_FullAccess`) | **403** — Forbidden |
| 15 | `GET /api/receipts` (no `FabricsReceiving_Receipts_View`) | **403** — Forbidden |
| 16 | `GET /api/admin` (no `Administration_FullAccess`) | **403** — Forbidden |
| 17 | `GET /mock-apps/HR` (served by MockAppController) | **200** — 3492 bytes HTML |
| 18 | `GET /api/modules/accessible` | **200** — All 5 modules visible (none have `auth_module_permissions` entries) |
| 19 | `GET /api/hr` via Vite proxy (`localhost:5173`) | **200** — Proxy forwarding works |
| 20 | `GET /mock-apps/HR` via Vite proxy (`localhost:5173`) | **200** — 3492 bytes HTML |

**Duplicate route registration:** Attempting to create a route with same `HttpMethod`+`RoutePattern` as an existing row returns **500** (unique index violation on `IX_auth_api_service_routes_HttpMethod_RoutePattern`).

---

## Quick Reference: Key Files

### Frontend (React)

| File | Purpose |
|---|---|
| `Central_auth/src/lib/api.ts` | All API calls, fetch wrapper, types/interfaces (includes `api.modules.routes.*`, `api.modules.permissions.*`) |
| `Central_auth/src/lib/auth.ts` | localStorage session management (get/save/clear) |
| `Central_auth/src/components/ProtectedRoute.tsx` | Route guard component |
| `Central_auth/src/components/Sidebar.tsx` | Hardcoded admin nav + dynamic "Applications" section (localStorage cache, 5 min TTL, from `accessible_modules` key) |
| `Central_auth/src/App.tsx` | Router with all routes |
| `Central_auth/src/pages/Login.tsx` | Login form, saves session to localStorage |
| `Central_auth/src/pages/Roles.tsx` | Role CRUD with permission checkboxes |
| `Central_auth/src/pages/Users.tsx` | User CRUD with role assignment |
| `Central_auth/src/pages/Permissions.tsx` | Permission CRUD with create/delete, group dropdown from modules |
| `Central_auth/src/pages/Modules.tsx` | Module CRUD + route management (expandable sections with chevron, add/edit/delete routes, HTTP method dropdown + permission datalist) + Manage Permissions modal (permission search + multi-select) |
| `Central_auth/src/components/UserForm.tsx` | User create/edit form with role multi-select |
| `Central_auth/vite.config.ts` | Dev server proxy config (/api, /auth, /mock-apps) |

### Backend (.NET 8)

| File | Purpose |
|---|---|
| `Central_auth_api/Controllers/AuthController.cs` | Login endpoint, JWT generation with permission claims |
| `Central_auth_api/Controllers/RolesController.cs` | Role CRUD with permission assignment |
| `Central_auth_api/Controllers/UsersController.cs` | User CRUD with role assignment |
| `Central_auth_api/Controllers/ModulesController.cs` | Module CRUD + `GET /accessible` (sidebar), `GET|POST|PUT|DELETE /{id}/routes` (route management), `GET|PUT /{id}/permissions` (permission assignment) |
| `Central_auth_api/Filters/DynamicPermissionMiddleware.cs` | Middleware that enforces route permissions |
| `Central_auth_api/Filters/DynamicPermissionFilter.cs` | Filter (alternative enforcement layer) |
| `Central_auth_api/Controllers/TestEndpointsController.cs` | Protected backend data stubs |
| `Central_auth_api/Controllers/MockAppController.cs` | HTML mock pages with JS security guard |
| `Central_auth_api/Program.cs` | Service registration, middleware pipeline |
| `Central_auth_api/Data/CentralAuthDbContext.cs` | EF Core DbContext, audit trail |
| `Central_auth_api/Models/ModulePermission.cs` | Junction entity for `auth_module_permissions` table (ModuleId ↔ PermissionId) |
| `Central_auth_api/Models/ApiServiceRoute.cs` | Route entity with ModuleId FK (no more ServiceId), RequiredPermissionCode for middleware |
