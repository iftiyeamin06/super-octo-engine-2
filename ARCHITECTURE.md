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
│   │   ├── ServicesController.cs     → /api/services
│   │   ├── ApiServiceRoutesController.cs → /api/api-service-routes
│   │   ├── ModulesController.cs      → /api/modules
│   │   ├── TestEndpointsController.cs  → /api/receipts, /api/admin,
│   │   │                                  /api/fabrics, /api/orders,
│   │   │                                  /api/inventory, /api/reports
│   │   ├── MockAppController.cs       → HTML mock pages for RBAC testing
│   │   └── ...
│   ├── Models/                  ← EF Core entities
│   │   ├── AppUser.cs, Role.cs, Permission.cs, RolePermission.cs
│   │   ├── UserRole.cs, Tenant.cs, TenantUser.cs
│   │   ├── Service.cs, ApiServiceRoute.cs
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
│   │   │   ├── Permissions.tsx      ← Read-only permission catalog viewer
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Services.tsx
│   │   │   ├── Modules.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx   ← Auth guard (checks localStorage)
│   │   │   ├── Layout.tsx           ← Sidebar + Header + main
│   │   │   ├── UserForm.tsx         ← User create/edit form with role multi-select
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts               ← fetch wrapper, all endpoint functions, types
│   │       ├── auth.ts              ← getSession, saveSession, clearSession, getToken
│   │       └── utils.ts             ← cn() for Tailwind class merging
│   └── vite.config.ts          ← Proxy /api/* → http://127.0.0.1:5089
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
auth_services
  ├── id (PK)
  ├── Name, Code (unique), BaseUrl
  ├── Description
  └── ...

auth_api_service_routes       ← Maps URL patterns to required permissions
  ├── id (PK)
  ├── ServiceId (FK → auth_services, nullable)
  ├── HttpMethod (GET, POST, *, etc.)
  ├── RoutePattern (e.g. "/api/inventory")
  ├── RequiredPermissionCode (e.g. "Inventory_FullAccess")
  ├── IsActive (soft delete flag)
  └── ...
```

### Entity Relationship Chain

```
auth_users
  └── auth_userroles (AppUserId → RoleId)
        └── auth_roles
              ├── auth_rolepermissions (RoleId → PermissionId)
              │     └── auth_permissions (Code = "Inventory_FullAccess")
              └── auth_rolemodules (RoleId → ModuleId)

auth_api_service_routes (RoutePattern → RequiredPermissionCode)
  └── No FK to permissions — matched by string Code at runtime
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
   ├── Path: "/dashboard", "/roles", "/users", "/services", etc.
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

### 8b. React admin pages (client-side route guard)

| Route | ProtectedRoute | Notes |
|---|---|---|
| `/login` | ❌ No | Public — unauthenticated users can reach it |
| `/dashboard` | ✅ Yes | Requires valid session in localStorage |
| `/roles` | ✅ Yes | Requires valid session |
| `/users` | ✅ Yes | Requires valid session |
| `/permissions` | ✅ Yes | Requires valid session |
| `/services` | ✅ Yes | Requires valid session |
| `/modules` | ✅ Yes | Requires valid session |
| `/tenants` | ✅ Yes | Requires valid session |
| `/sessions` | ✅ Yes | Requires valid session |
| `/audit` | ✅ Yes | Requires valid session |

> **Note:** The `ProtectedRoute` only checks for token **existence + expiry**. It does NOT check permission claims. Permission-based feature gating within admin pages would need additional logic (e.g., checking specific claims on the JWT payload).

---

## Quick Reference: Key Files

### Frontend (React)

| File | Purpose |
|---|---|
| `Central_auth/src/lib/api.ts` | All API calls, fetch wrapper, types/interfaces |
| `Central_auth/src/lib/auth.ts` | localStorage session management (get/save/clear) |
| `Central_auth/src/components/ProtectedRoute.tsx` | Route guard component |
| `Central_auth/src/App.tsx` | Router with all routes |
| `Central_auth/src/pages/Login.tsx` | Login form, saves session to localStorage |
| `Central_auth/src/pages/Roles.tsx` | Role CRUD with permission checkboxes |
| `Central_auth/src/pages/Users.tsx` | User CRUD with role assignment |
| `Central_auth/src/pages/Permissions.tsx` | Read-only permission catalog |
| `Central_auth/src/components/UserForm.tsx` | User create/edit form with role multi-select |
| `Central_auth/vite.config.ts` | Dev server proxy config |

### Backend (.NET 8)

| File | Purpose |
|---|---|
| `Central_auth_api/Controllers/AuthController.cs` | Login endpoint, JWT generation with permission claims |
| `Central_auth_api/Controllers/RolesController.cs` | Role CRUD with permission assignment |
| `Central_auth_api/Controllers/UsersController.cs` | User CRUD with role assignment |
| `Central_auth_api/Controllers/ApiServiceRoutesController.cs` | Route-permission mapping CRUD |
| `Central_auth_api/Filters/DynamicPermissionMiddleware.cs` | Middleware that enforces route permissions |
| `Central_auth_api/Filters/DynamicPermissionFilter.cs` | Filter (alternative enforcement layer) |
| `Central_auth_api/Controllers/TestEndpointsController.cs` | Protected backend data stubs |
| `Central_auth_api/Controllers/MockAppController.cs` | HTML mock pages with JS security guard |
| `Central_auth_api/Program.cs` | Service registration, middleware pipeline |
| `Central_auth_api/Data/CentralAuthDbContext.cs` | EF Core DbContext, audit trail |
