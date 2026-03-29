# Ven Dot — Vendor Payment Management System

## Full Implementation Plan

**Stack:** React + Vite + TailwindCSS · .NET 8 Web API · Entity Framework Core · MSSQL 

**Connection string (application database — not `master`):**  
`Server=localhost\SQLEXPRESS;Database=VenDot;Trusted_Connection=True;TrustServerCertificate=True;`

`TrustServerCertificate=True` avoids ODBC Driver 18 TLS/certificate issues on local SQL Express. For production, use proper certificates and stricter settings.

---

## 0. Create the VenDot database

Create the database **once** on your machine before running EF Core migrations. The logical name is **VenDot** (capital V and D).

### Option A — SQL Server Management Studio (SSMS)

1. Connect to `localhost\SQLEXPRESS` (Windows Authentication is typical).
2. New Query, run:

```sql
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'VenDot')
    CREATE DATABASE VenDot;
```

3. Confirm **VenDot** appears under Databases.

### Option B — `sqlcmd` (command line)

From PowerShell or Command Prompt (adjust server if yours differs):

```bash
sqlcmd -S "localhost\SQLEXPRESS" -E -C -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'VenDot') CREATE DATABASE VenDot;"
```

- `-E` = Windows integrated security.  
- `-C` = trust server certificate (same idea as `TrustServerCertificate=True` in the app connection string).

If `sqlcmd` reports the database already exists, no action is needed.

### After the database exists

Point `Backend/appsettings.json` (and `appsettings.Development.json`) `ConnectionStrings:DefaultConnection` at **VenDot**, then run EF migrations from the Backend project so tables are created inside **VenDot**.

---

## 1. Project Overview

**VenDot** is a web application that manages payments to registered vendors. It replaces manual emails and spreadsheets with a structured approval workflow.

**Core Flow:**
Admin registers vendors → Accountant raises payment requests with line items and tax → Manager approves or rejects → Analyst generates filtered reports

**Four roles:** Admin · Accountant · Manager · Analyst. All users share the same login and password-change flows (`TempPass` when an admin sets a temporary password).

---

## 2. Solution Structure

Both `backend/` and `frontend/` hold their code directly — no extra wrapper folders.

```
ven./
├── backend/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── UserController.cs
│   │   ├── VendorController.cs
│   │   ├── TaxController.cs
│   │   ├── PaymentController.cs
│   │   └── ReportController.cs
│   ├── Models/
│   │   ├── Role.cs
│   │   ├── User.cs
│   │   ├── Vendor.cs
│   │   ├── VendorBankAccount.cs
│   │   ├── TaxType.cs
│   │   ├── PaymentRequest.cs
│   │   ├── PaymentItem.cs
│   │   └── Report.cs
│   ├── DTOs/
│   │   ├── LoginRequest.cs
│   │   ├── LoginResponse.cs
│   │   ├── ChangePwdRequest.cs
│   │   ├── CreateUserRequest.cs
│   │   ├── CreateVendorRequest.cs
│   │   ├── CreatePaymentRequest.cs   -- includes vendorId, vendorBankAccountId, line items, tax fields
│   │   └── GenerateReportRequest.cs
│   ├── Services/
│   │   ├── AuthService.cs
│   │   ├── UserService.cs
│   │   ├── VendorService.cs
│   │   ├── PaymentService.cs
│   │   └── ReportService.cs
│   ├── Data/
│   │   ├── AppDbContext.cs
│   │   └── Seeder.cs            -- Optional Dev/Demo Bootstrap only; Not Required in Production (See §5.2)
│   ├── Middleware/
│   │   ├── ErrorHandler.cs
│   │   └── TempPassMiddleware.cs   -- Blocks API except auth/password routes when user must change password
│   ├── HostedWorkers/
│   │   └── ReportBackgroundWorker.cs   -- IHostedService: runs report jobs with IServiceScopeFactory (see §5.9 / §8)
│   └── Program.cs
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── http.js
    │   │   ├── authApi.js
    │   │   ├── userApi.js
    │   │   ├── vendorApi.js
    │   │   ├── paymentApi.js
    │   │   └── reportApi.js
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── StatusBadge.jsx
    │   │   ├── DataTable.jsx
    │   │   ├── Modal.jsx
    │   │   ├── VendorPicker.jsx
    │   │   ├── BankAccountPicker.jsx
    │   │   ├── LineItemsTable.jsx
    │   │   └── TaxPicker.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx          -- Username/Password Login + New-Password Step (when tempPass) on Same Route
    │   │   ├── AdminDashboard.jsx
    │   │   ├── UserListPage.jsx
    │   │   ├── VendorListPage.jsx
    │   │   ├── VendorFormPage.jsx
    │   │   ├── BankAccountPage.jsx
    │   │   ├── AccountantDashboard.jsx
    │   │   ├── PaymentFormPage.jsx
    │   │   ├── PaymentListPage.jsx
    │   │   ├── ManagerDashboard.jsx
    │   │   ├── PaymentDetailPage.jsx
    │   │   ├── AnalystDashboard.jsx
    │   │   └── ReportListPage.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx    -- AuthProvider + useAuth; session state + localStorage sync
    │   └── main.jsx
    ├── vite.config.js
    └── tailwind.config.js
```

---

## 3. Naming Rules (Strictly Enforced)

| What | Rule | Examples |
|------|------|---------|
| Files (backend) | PascalCase, full words, no abbreviations | `AuthController.cs`, `UserService.cs`, `AppDbContext.cs` |
| Files (frontend) | PascalCase for components/pages, camelCase for api/context | `LoginPage.jsx`, `VendorPicker.jsx`, `authApi.js`, `AuthContext.jsx` |
| Variables | readable, no abbreviations | `userId`, `vendorList`, `paymentItems`, `taxRate` |
| Functions | verb + full noun | `getUsers`, `savePayment`, `generateReport`, `changePassword` |
| API routes | lowercase kebab | `/api/auth/login`, `/api/payments` |
| DB columns | PascalCase | `FullName`, `TotalAmount`, `SubmittedAt` |

---

## 4. Database Schema (MSSQL via EF Core)

All models go in `Models/`. EF Core migrations manage all tables.

### 4.1 Roles
```
Roles
  Id     INT PK auto
  Name   NVARCHAR(50)    -- Admin, Accountant, Manager, Analyst

Seed: 1=Admin  2=Accountant  3=Manager  4=Analyst
```

### 4.2 Users
```
Users
  Id             INT PK auto
  FullName       NVARCHAR(150)
  Username       NVARCHAR(100) UNIQUE
  Email          NVARCHAR(200)
  PasswordHash   NVARCHAR(500)    -- BCrypt hash (BCrypt.Net-Next); never store plain text
  TempPass       BIT              -- true = admin set a temp password; user must change password before using the rest of the app
  IsActive       BIT
  RoleId         INT FK → Roles
```

> **Key Change from Spec:** `IsFirstLogin` is renamed to `TempPass`. The logic is simpler:
> - Admin creates a user and sets a temp password → stored as **BCrypt hash**, `TempPass = true`
> - On login, if `TempPass = true`, the JWT response includes `"tempPass": true` and the JWT includes a **`must_change_password`** claim (or equivalent) so the **API** can enforce the rule (see §5.4)
> - The frontend keeps the user on `LoginPage` and swaps to the "set new password" step (same `/login` URL) — no separate route
> - No separate "first login detection" flow; any login with `TempPass = true` forces that step before the app unlocks
> - Once the user saves a new password, `TempPass = false`, password is re-hashed, and they land on their dashboard
> - Admin can also reset a user's password at any time, which sets `TempPass = true` again (new temp password is hashed)

### 4.3 Vendors
```
Vendors
  Id           INT PK auto
  Name         NVARCHAR(200)
  ContactName  NVARCHAR(150)
  Email        NVARCHAR(200)
  Phone        NVARCHAR(50)
  Address      NVARCHAR(500)
  IsActive     BIT
  CreatedAt    DATETIME2
```

### 4.4 VendorBankAccounts
```
VendorBankAccounts
  Id           INT PK auto
  VendorId     INT FK → Vendors
  BankName     NVARCHAR(200)
  AccountName  NVARCHAR(200)
  AccountNo    NVARCHAR(50)
  RoutingNo    NVARCHAR(50)
  SwiftCode    NVARCHAR(20)   -- nullable
  IsDefault    BIT
```

### 4.5 TaxTypes
```
TaxTypes
  Id           INT PK auto
  Name         NVARCHAR(50)
  Rate         DECIMAL(5,4)    -- 0.1000 = 10%
  Description  NVARCHAR(200)
  IsActive     BIT

Seed: 1=None(0%)  2=GST(10%)  3=VAT(15%)  4=WHT(5%)
```

### 4.6 PaymentRequests
```
PaymentRequests
  Id                  INT PK auto
  VendorId            INT FK → Vendors
  VendorBankAccountId INT FK → VendorBankAccounts   -- which account was used for this request
  InvoiceNo           NVARCHAR(100)
  -- Snapshot at submit time (historical truth if vendor edits accounts later)
  SnapshotBankName    NVARCHAR(200)
  SnapshotAccountName NVARCHAR(200)
  SnapshotAccountNo   NVARCHAR(50)
  SnapshotRoutingNo   NVARCHAR(50)
  SnapshotSwiftCode   NVARCHAR(20)   -- nullable
  SubTotal            DECIMAL(18,2)
  TaxTypeId           INT FK → TaxTypes   -- null if custom rate entered
  TaxRate             DECIMAL(5,4)        -- always stored regardless of source
  TaxAmount           DECIMAL(18,2)
  TotalAmount         DECIMAL(18,2)
  DueDate             DATE
  Status              NVARCHAR(20)        -- PENDING | APPROVED | REJECTED
  Notes               NVARCHAR(500)       -- accountant notes, optional
  SubmittedById       INT FK → Users
  ReviewedById        INT FK → Users      -- null until reviewed
  ReviewNote          NVARCHAR(500)       -- manager note, optional
  SubmittedAt         DATETIME2
  ReviewedAt          DATETIME2           -- null until reviewed
```

Optional uniqueness (recommended if your business rules require it): unique index on `(VendorId, InvoiceNo)` for active/historical rows as you prefer.

### 4.7 PaymentItems
```
PaymentItems
  Id               INT PK auto
  PaymentRequestId INT FK → PaymentRequests
  Description      NVARCHAR(300)
  Quantity         DECIMAL(10,2)
  UnitPrice        DECIMAL(18,2)
  LineTotal        DECIMAL(18,2)   -- stored as Quantity × UnitPrice
```

### 4.8 Reports
```
Reports
  Id             INT PK auto
  ReportType     NVARCHAR(50)     -- Summary | ByVendor | ByStatus | ByAccountant | ByMonth
  FilterJson     NVARCHAR(MAX)    -- JSON of all applied filters (audit trail)
  ReportResultJson NVARCHAR(MAX)  -- JSON output produced when Status becomes READY (download returns this; stable audit)
  GeneratedById  INT FK → Users
  Status         NVARCHAR(20)     -- PROCESSING | READY | FAILED
  RequestedAt    DATETIME2
  CompletedAt    DATETIME2        -- null until ready

  -- FilePath: add when PDF export is implemented (see §12)
```

---

## 5. Backend — .NET 8 Web API

### 5.1 Setup and Packages

```bash
dotnet new webapi -n VenDot
```

Packages to install:
- `Microsoft.EntityFrameworkCore.SqlServer`
- `Microsoft.EntityFrameworkCore.Tools`
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `BCrypt.Net-Next` — password hashing (required for this capstone; see §4.2)

> **Later (PDF only):** `QuestPDF` — see §12.

### 5.2 Data Layer

**Connection string:** Use the **VenDot** database (see **§0**). Example in `appsettings.Development.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=VenDot;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

**`Data/AppDbContext.cs`** — EF Core DbContext
```csharp
// DbSets for all 8 tables:
// Roles, Users, Vendors, VendorBankAccounts,
// TaxTypes, PaymentRequests, PaymentItems, Reports
// Seed data applied via HasData in OnModelCreating
```

**`Data/Seeder.cs` (optional — not a production dependency)**  
- Use only for **local/dev/demo**: e.g. insert the known **demo admin** user, optional demo vendors/users from section 13.  
- **Do not** register required reference data only here. **Roles and tax types** must exist via **EF migrations** (`HasData` in `OnModelCreating` or migration scripts) so a production database is valid **without** ever running `Seeder`.  
- **`Program.cs`:** call `Seeder` only when appropriate (e.g. `if (app.Environment.IsDevelopment())` or an explicit `SEED_DEMO` flag). In production, **omit the call** — the API must start and run normally.  
- **Production:** you can **delete `Seeder.cs`** and remove its invocation; create the first admin through a one-time SQL/script or your own process. The app must not assume `Seeder` ran on startup.

### 5.3 JWT Authentication

All protected endpoints require a valid JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

**JWT configuration:** Keep **`Jwt:Secret`** out of source control when possible. For local development use [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) (`dotnet user-secrets set "Jwt:Secret" "<long-random-string>"`). `appsettings.json` may omit the secret or use a placeholder; production should use environment variables or a vault.

Example shape (secret supplied via user secrets / environment):
```json
{
  "Jwt": {
    "Issuer": "vendot",
    "Audience": "vendot",
    "ExpireHours": 8
  }
}
```

**JWT token claims (set on every login):**
- `userId` — the user's integer ID from the database
- `role` — the user's role name (Admin / Accountant / Manager / Analyst)
- `name` — the user's full name (for display in the navbar)
- `must_change_password` — `"true"` or `"false"` string (or use a boolean claim type); **must be `true` when `TempPass` is true** so middleware can block other endpoints until `POST /api/auth/change-password` succeeds

**HTTPS:** Use HTTPS in production; passwords and tokens must not go over plain HTTP in real deployments.

**`Program.cs`** JWT setup:
```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(config["Jwt:Secret"]))
        };
    });
```

Every controller is decorated with `[Authorize]`. Role-specific endpoints use `[Authorize(Roles = "Admin")]` etc. The backend always validates the JWT role claim server-side — frontend role checks only control which pages are visible, never actual security.

### 5.3.1 TempPass enforcement (server-side)

**Problem solved:** A user with `TempPass = true` must not call vendor/payment/report APIs with a valid JWT until they change their password.

**Approach:** After login, include **`must_change_password`** in the JWT when `TempPass` is true. Add **`TempPassMiddleware`** (after `UseAuthentication`, before endpoints) that:

- Allows anonymous access to `POST /api/auth/login`
- Allows authenticated access only to `POST /api/auth/change-password` (and optionally logout) while `must_change_password` is true
- Returns **403** for all other routes until the user completes change-password (which clears `TempPass` and issues a new JWT without the restriction, or sets claim to false)

Frontend route guards remain; this middleware is the real security boundary.

### 5.4 Auth — `TempPass` Flow

**`Controllers/AuthController.cs`**

`POST /api/auth/login`
- Find user by username
- Verify password with **`BCrypt.Verify`** against `PasswordHash`
- Check `IsActive`
- Build and sign JWT with claims: `userId`, `role`, `name`, **`must_change_password`** (matches `TempPass`)
- **If `TempPass = true`: include `"tempPass": true` in the response body alongside the token**
- Frontend keeps the user on `LoginPage` and shows the new-password step (still `/login`)

`POST /api/auth/change-password`
- Requires valid JWT in Authorization header (still subject to middleware: only this route allowed while `must_change_password` is true)
- Accepts: `{ newPassword }`
- Save **`BCrypt.HashPassword`** to `PasswordHash`, set `TempPass = false`
- Return new token **or** require re-login — pick one approach consistently; if returning a new JWT, include `must_change_password: false`
- Returns 200 OK

**`Services/AuthService.cs`**
- `Login(username, password)` → returns `{ token, tempPass, role, name }`
- `ChangePassword(userId, newPassword)` → updates `PasswordHash`, sets `TempPass = false`

**JWT Login Response Shape:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tempPass": false,
  "role": "Accountant",
  "name": "Jane Smith"
}
```

### 5.5 Users — `Controllers/UserController.cs` (Admin only)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user — auto-sets `TempPass = true` |
| PUT | `/api/users/{id}` | Update name, email, role |
| PATCH | `/api/users/{id}/deactivate` | Set `IsActive = false` |
| PATCH | `/api/users/{id}/reset-password` | Admin sets a new temp password → `TempPass = true` |

**`Services/UserService.cs`**
- `GetAll()` — returns list of all users with role names (never return `PasswordHash` to clients)
- `Create(createUserRequest)` — **`BCrypt.HashPassword`** on temp password, sets `TempPass = true`
- `Update(id, updateRequest)` — updates name, email, role
- `Deactivate(id)` — sets `IsActive = false`
- `ResetPassword(id, tempPassword)` — **`BCrypt.HashPassword`** on new temp password, sets `TempPass = true`

### 5.6 Vendors — `Controllers/VendorController.cs`

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/vendors` | Admin, Accountant | List active vendors |
| POST | `/api/vendors` | Admin | Register new vendor |
| PUT | `/api/vendors/{id}` | Admin | Edit vendor details |
| PATCH | `/api/vendors/{id}/deactivate` | Admin | Archive vendor (hides from dropdowns) |
| GET | `/api/vendors/{id}/accounts` | Admin | List bank accounts for a vendor |
| POST | `/api/vendors/{id}/accounts` | Admin | Add bank account to vendor |
| PUT | `/api/vendors/{id}/accounts/{accountId}` | Admin | Edit bank account details |
| PATCH | `/api/vendors/{id}/accounts/{accountId}/default` | Admin | Set as default account |

**`Services/VendorService.cs`**
- `GetAll()` — returns only `IsActive = true` vendors
- `Create(createVendorRequest)` — saves vendor with `CreatedAt = DateTime.UtcNow`
- `Update(id, updateRequest)` — updates vendor fields
- `Deactivate(id)` — sets `IsActive = false`
- `GetAccounts(vendorId)` — returns all bank accounts for the vendor
- `AddAccount(vendorId, accountRequest)` — saves bank account
- `UpdateAccount(vendorId, accountId, accountRequest)` — updates bank account fields
- `SetDefault(vendorId, accountId)` — sets `IsDefault = true` for this account, `false` for all others belonging to the same vendor

### 5.7 Tax Types — `Controllers/TaxController.cs`

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/tax-types` | All | List active tax types for dropdown |

### 5.8 Payments — `Controllers/PaymentController.cs`

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| GET | `/api/payments` | Accountant, Manager | Role-filtered list |
| POST | `/api/payments` | Accountant | Create request with line items |
| GET | `/api/payments/{id}` | Accountant, Manager | Full detail with vendor, items, tax |
| POST | `/api/payments/{id}/approve` | Manager | Approve + optional note |
| POST | `/api/payments/{id}/reject` | Manager | Reject + optional note |

**`Services/PaymentService.cs`**
- `GetAll(userId, role)` — Accountant sees only their own; Manager sees all PENDING
- `Create(createPaymentRequest, submittedById)` — requires **`vendorBankAccountId`** (must belong to the selected vendor); copies **snapshot** columns from that `VendorBankAccount` row; saves request + line items; validate at least one line item, positive quantity and unit price; all money math server-side
- `GetById(id)` — returns full detail using **snapshot** fields for bank display; include live vendor name from `Vendors` as needed
- `Approve(id, reviewedById, note)` — sets `Status = APPROVED`, saves `ReviewedAt = now`, stores note
- `Reject(id, reviewedById, note)` — sets `Status = REJECTED`, saves `ReviewedAt = now`, stores note

**Calculation rules — always recalculated in `PaymentService`, never trusted from the frontend:**
```
LineTotal    = Quantity × UnitPrice   (per item)
SubTotal     = sum of all LineTotals
TaxAmount    = SubTotal × TaxRate
TotalAmount  = SubTotal + TaxAmount
```

### 5.9 Reports — `Controllers/ReportController.cs`

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | `/api/reports/generate` | Analyst | Queue report, return ID immediately |
| GET | `/api/reports` | Analyst, Admin | List reports |
| GET | `/api/reports/{id}` | Analyst, Admin | Status check — frontend polls this every 3s |
| GET | `/api/reports/{id}/download` | Analyst, Admin | Download report data (JSON now; PDF in future) |

**`Services/ReportService.cs`**
- `Queue(generateReportRequest, generatedById)` — saves a Reports row (`Status = PROCESSING`), enqueues work for the background worker (see below), returns the new report ID immediately
- `ProcessReport(reportId)` — runs inside a **scoped** service (via `IServiceScopeFactory`): queries `PaymentRequests` with filters, aggregates by report type, writes **`ReportResultJson`**, sets `Status = READY` and `CompletedAt`; on exception sets `FAILED`
- `GetAll(userId, role)` — Analyst sees own; Admin sees all
- `GetById(id)` — returns report status and metadata
- `Download(id)` — returns **`ReportResultJson`** (the stored JSON from generation time), not a fresh recompute — stable audit trail

**Background execution (replace raw `Task.Run`):** Register an **`IHostedService`** (e.g. `HostedWorkers/ReportBackgroundWorker.cs`) that uses a channel or queue of report IDs and, for each job, creates a scope (`scope.ServiceProvider.GetRequiredService<ReportService>()`) and calls `ProcessReport`. This avoids disposing `DbContext` incorrectly and survives the pattern better than fire-and-forget `Task.Run` on the request thread.

**Report Types:**
- `Summary` — total count and total value of all matching requests
- `ByVendor` — totals grouped by each vendor name
- `ByStatus` — totals grouped by PENDING / APPROVED / REJECTED
- `ByAccountant` — totals grouped by the submitting accountant's name
- `ByMonth` — totals broken down by calendar month

**Available Filters (all optional — backend builds a dynamic LINQ query):**

| Filter | Filters On |
|--------|-----------|
| Date From / To | PaymentRequests.SubmittedAt |
| Due Date From / To | PaymentRequests.DueDate |
| Vendor (multi-select) | PaymentRequests.VendorId |
| Status (checkboxes) | PaymentRequests.Status |
| Submitted By (multi-select) | PaymentRequests.SubmittedById |
| Reviewed By (multi-select) | PaymentRequests.ReviewedById |
| Min Amount / Max Amount | PaymentRequests.TotalAmount |
| Tax Type (multi-select) | PaymentRequests.TaxTypeId |

All applied filter values are saved as JSON in `Reports.FilterJson` for audit purposes.

### 5.10 Middleware

**`Middleware/TempPassMiddleware.cs`** — see §5.3.1. Blocks API usage until password change when the JWT indicates `must_change_password`.

**`Middleware/ErrorHandler.cs`** — global exception middleware. Catches all unhandled exceptions and returns:
```json
{ "error": "Something went wrong." }
```
Returns 400 for validation errors, 401 for auth failures, 403 for wrong role, 404 for not found, 500 for unhandled exceptions.

**`Program.cs`** registers:
- `AppDbContext` with SQL Server connection string pointing at **VenDot** (see §0, §5.2)
- JWT Bearer authentication (as shown in section 5.3)
- All service classes registered with `AddScoped`
- Report background worker (`IHostedService`) if using the queued report pattern (§5.9)
- CORS policy allowing `http://localhost:5173` in development
- `TempPassMiddleware` after authentication so claims are available
- `ErrorHandler` middleware
- `UseAuthentication()` and `UseAuthorization()` in the correct order
- **Optional:** `Seeder` invocation only in dev/demo — never required for production (see §5.2); demo admin password must be **hashed** in seeder code

---

## 6. Frontend — React + Vite + TailwindCSS

### 6.1 Setup
```bash
bunx create-vite . --template react
bun add axios react-router-dom
```

Tailwind: either follow the official Tailwind **v4** + Vite setup (`@tailwindcss/vite` in `vite.config.js`, `@import "tailwindcss"` in CSS) as in this repo, **or** use the classic `bunx tailwindcss init -p` flow with a `tailwind.config.js`:

```js
content: ['./index.html', './src/**/*.{js,jsx}']
```

`.env`:
```
VITE_API_URL=http://localhost:5260
```

**Local dev URLs:** Vite serves the frontend at `http://localhost:5173`. Run the .NET API on `http://localhost:5260` (see `Backend/Properties/launchSettings.json`) and keep `VITE_API_URL` pointing at that origin.

### 6.2 Auth — React Context (`context/AuthContext.jsx`)

**No Zustand** — auth is a small slice of state; **Context + `useState`** is enough.

**State shape:** `{ token, role, name, tempPass }` (all nullable / defaults until login).

**`AuthProvider`** (wrap the app in `main.jsx`, inside `BrowserRouter`):
- Holds the four fields in `useState`.
- **`setAuth(loginResponse)`** — called after `POST /api/auth/login` succeeds; saves `{ token, role, name, tempPass }`.
- **`clearAuth()`** — clears state and removes the persisted session (logout, 401, etc.).
- **`markPasswordChanged()`** — after successful `changePassword`, set `tempPass` to `false` and update persisted copy.

**Persistence (stay logged in on refresh):**
- On each successful `setAuth` / `markPasswordChanged` / `clearAuth`, sync to `localStorage` under one key (e.g. `venauth` as JSON).
- On provider mount, `useEffect` reads that key once and hydrates state if present (invalid JSON → treat as logged out).

**`useAuth()`** — custom hook that `useContext(AuthContext)`; throws if used outside `AuthProvider`. Pages and layout call `const { token, role, name, tempPass, setAuth, clearAuth, markPasswordChanged } = useAuth()`.

**Token for Axios (avoid circular imports):** In `AuthContext.jsx`, keep the current token in a **`useRef`** mirrored whenever `token` state changes, and **`export function getAuthToken()`** that returns `ref.current`. `api/http.js` imports only `getAuthToken` (not React) and the request interceptor does `Authorization: Bearer ${getAuthToken() ?? ''}`. Alternatively, read the same `localStorage` key inside the interceptor — works if you always write there when state changes (single source if you prefer).

**Route guards / `LoginPage`:** Read `token`, `tempPass`, `role` from `useAuth()` instead of a global store.

### 6.3 Axios Instance — `api/http.js`

```js
// baseURL from import.meta.env.VITE_API_URL
// Request interceptor: getAuthToken() from AuthContext module → Authorization: Bearer …
// Response interceptor:
//   - 401 → clearAuth() (import from a small auth-actions module or pass navigate — see note below) and redirect to /login
//   - 400/500 → surface `error` message to the UI (e.g. ErrorContext + dismissible banner in Layout, or page-level state)
```

**401 + `clearAuth`:** The interceptor cannot import the provider directly. Use a **module-level callback** the `AuthProvider` registers on mount (e.g. `setSessionClearHandler(fn)` in a tiny `authSession.js`), or clear `localStorage` and `window.location.assign('/login')` — one pattern for the whole app.

### 6.4 API Modules

Each file makes the axios calls for one domain and exports named functions that the pages call:

| File | Exported Functions |
|------|--------------------|
| `api/authApi.js` | `login(username, password)`, `changePassword(newPassword)` |
| `api/userApi.js` | `getUsers()`, `createUser(data)`, `updateUser(id, data)`, `deactivateUser(id)`, `resetPassword(id, tempPassword)` |
| `api/vendorApi.js` | `getVendors()`, `createVendor(data)`, `updateVendor(id, data)`, `deactivateVendor(id)`, `getBankAccounts(vendorId)`, `addBankAccount(vendorId, data)`, `updateBankAccount(vendorId, accountId, data)`, `setDefaultAccount(vendorId, accountId)` |
| `api/paymentApi.js` | `getPayments()`, `createPayment(data)`, `getPaymentById(id)`, `approvePayment(id, note)`, `rejectPayment(id, note)` |
| `api/reportApi.js` | `generateReport(filters)`, `getReports()`, `getReportById(id)`, `downloadReport(id)` |

### 6.5 Routing — `main.jsx`

Wrap the app as **`BrowserRouter` → `AuthProvider` → `Routes`** so every route and the axios layer can use `useAuth()` after hydration.

```
/login                     → LoginPage.jsx            (no token: username/password; token + tempPass: new-password step; otherwise redirect to dashboard)
/admin/users               → UserListPage.jsx         (Admin only)
/admin/vendors             → VendorListPage.jsx       (Admin only)
/admin/vendors/:id/banks   → BankAccountPage.jsx      (Admin only)
/admin/reports             → ReportListPage.jsx       (Admin only)
/accountant/payments/new   → PaymentFormPage.jsx      (Accountant only)
/accountant/payments       → PaymentListPage.jsx      (Accountant only)
/manager/payments          → ManagerDashboard.jsx     (Manager only)
/manager/payments/:id      → PaymentDetailPage.jsx    (Manager only — Accountant reads via /accountant/payments/:id)
/analyst/reports           → ReportListPage.jsx       (Analyst only)
```

**Route Guard Logic:**
- No token (from `useAuth()`) → redirect to `/login`
- Token present + `tempPass = true` → redirect to `/login` (LoginPage shows the new-password step only; no other page accessible)
- Token present + role does not match the route's required role → redirect to that user's own role dashboard
- All other cases → render the page

### 6.6 Shared Components

**`components/Layout.jsx`**
Top navbar showing the app logo, logged-in user's name, and a logout button. Left sidebar with navigation links — the links shown depend on the logged-in user's role. Uses `<Outlet />` to render the current page content. Role-to-links mapping is a config object so adding a new link only requires updating the config.

**`components/StatusBadge.jsx`**
Colored pill component. Accepts a `status` string prop and renders the correct Tailwind color classes:
- `PENDING` → yellow background
- `APPROVED` → green background
- `REJECTED` → red background
- `PROCESSING` → blue background
- `READY` → green background
- `FAILED` → red background

**`components/DataTable.jsx`**
Generic reusable table. Accepts `columns` (array of `{ key, label }`) and `rows` (array of data objects). Renders headers and cell values automatically. Used on every list page to avoid repeating table markup.

**`components/Modal.jsx`**
Centered overlay with a backdrop, a title prop, a children slot for the form content, and a close button. Used for all Add/Edit forms across the app.

**`components/VendorPicker.jsx`**
Searchable dropdown component. Calls `GET /api/vendors` on mount and loads the vendor list. Filters the displayed options as the user types. Accepts `value` and `onChange` props. Passes the selected `vendorId` back via `onChange`.

**`components/BankAccountPicker.jsx` (or inline on payment form)**  
After a vendor is selected, load `GET /api/vendors/{id}/accounts` and let the accountant pick **one** bank account. Submit `vendorBankAccountId` with the payment create request.

**`components/LineItemsTable.jsx`**
Table component for managing payment line items. Each row has: Description (text input), Quantity (number input), Unit Price (number input), Line Total (read-only, auto-calculated as Quantity × Unit Price). "Add Row" button at the bottom, a remove (×) button on each row. Subtotal is shown below the table, summed from all Line Totals. Passes the current array of item objects back via `onChange`.

**`components/TaxPicker.jsx`**
Calls `GET /api/tax-types` on mount and loads the options. Renders a dropdown of preset tax types (None, GST, VAT, WHT). When a preset is selected, the rate fills in automatically and the tax amount recalculates. A "Custom" option in the dropdown reveals a manual rate % input; typing updates the tax amount instantly. All calculation is done inside this component's local state. Passes `{ taxTypeId, taxRate, taxAmount }` back via `onChange`.

### 6.7 Pages

#### `LoginPage.jsx`
**Step 1 — Sign in:** Username and Password fields. On submit calls `authApi.login()`. On success: `setAuth({ token, role, name, tempPass })` from `useAuth()`. If `tempPass = false` → navigate to the role's default dashboard. If `tempPass = true` → stay on this page and render **Step 2** (same `/login` URL; do not navigate away).

**Step 2 — New password (only when `tempPass` after login):** New Password and Confirm Password fields. Validates they match and are at least 8 characters. On submit calls `authApi.changePassword()` (JWT from Step 1). On success: `markPasswordChanged()` (sets `tempPass = false` in context + `localStorage`), navigates to role dashboard. No way to skip — the page stays on this step until completed; route guard blocks every other route while `tempPass` is true.

#### `UserListPage.jsx` (Admin)
DataTable showing Full Name, Username, Email, Role, and Status (Active / Inactive badge). "Add User" button opens a Modal with fields: Full Name, Username, Email, Role dropdown, Temp Password. On save: calls `createUser` — backend automatically sets `TempPass = true`. Edit button per row opens the same Modal pre-filled (no password field in edit). Deactivate button shows a confirmation dialog then calls `deactivateUser`. Reset Password button opens a small dialog to enter a new temp password, calls `resetPassword` — user will be forced to change on their next login.

#### `VendorListPage.jsx` (Admin)
DataTable showing Name, Contact Name, Email, Phone, and Status. "Add Vendor" button opens a Modal with all vendor fields. Edit button per row opens same Modal pre-filled. Deactivate button with confirmation. "Bank Accounts" button per row navigates to `BankAccountPage` for that vendor.

#### `BankAccountPage.jsx` (Admin)
Shows the vendor name at the top for context. DataTable showing Bank Name, Account Name, Account No, Routing No, Swift Code, and a Default indicator. "Add Bank Account" button opens a Modal with all account fields. Edit button per row. "Set as Default" button per row calls `setDefaultAccount`.

#### `PaymentFormPage.jsx` (Accountant)
Full payment creation form:
- `VendorPicker` to select the vendor
- Bank account selector for that vendor (`vendorBankAccountId` sent to API)
- Invoice No text input
- Due Date picker
- `LineItemsTable` for all line items (add/remove rows, auto Line Total, auto Subtotal)
- `TaxPicker` for preset or custom tax (auto Tax Amount)
- Grand Total display (read-only, = SubTotal + Tax Amount, shown prominently)
- Notes text area (optional)
- Submit button calls `createPayment` with all data → navigates to `PaymentListPage` on success

#### `PaymentListPage.jsx` (Accountant)
DataTable showing Invoice No, Vendor Name, Grand Total, Status badge, Submitted Date. Clicking any row navigates to `PaymentDetailPage` in read-only mode (approve/reject buttons are not shown for accountants).

#### `ManagerDashboard.jsx` (Manager)
Two tabs — Pending and History. Pending tab shows a DataTable of all PENDING requests with Invoice No, Vendor, Accountant Name, Total, Submitted Date. Clicking a row navigates to `PaymentDetailPage`. History tab shows all reviewed requests with the decision badge and review date.

#### `PaymentDetailPage.jsx` (Manager + Accountant)
Full breakdown of a single request: vendor name and contact info, vendor bank account details, all line items in a table, tax type, tax rate, tax amount, and grand total. Accountant notes shown if present. Manager view shows an Approve button, a Reject button, and an optional review note input. On Approve: calls `approvePayment`, then navigates back (optional brief success message in local state). On Reject: same for `rejectPayment`. When viewed by an accountant: buttons are hidden, the status badge and any manager review note are shown instead.

#### `ReportListPage.jsx` (Analyst + Admin)
Filter panel (collapsible) with controls for all available filter types. Required Report Type selector. "Generate Report" button calls `reportApi.generateReport(filters)` and adds a new row to the table with Status = PROCESSING. DataTable showing Report Type, a summary of applied filters, Requested At timestamp, Status badge, and a Download button (shown only when Status = READY). Polling: a `setInterval` runs every 3 seconds and calls `getReportById(id)` for every PROCESSING row — when the status becomes READY, the Download button appears and the polling for that row stops; if FAILED, an error badge shows and polling stops. Admin's version of this page shows all reports from all analysts.

#### `AdminDashboard.jsx` (Admin)
Summary cards with links to User Management and Vendor Management. A quick-access reports section showing recent reports with a Download button.

#### `AccountantDashboard.jsx` (Accountant)
Summary cards showing Total Submitted, Pending, Approved, and Rejected counts. Quick links to New Payment Request and View All Requests.

#### `AnalystDashboard.jsx` (Analyst)
Summary cards showing Total Reports, Ready, and Processing counts. Quick link to the Reports page.

---

## 7. Temp Password → TempPass Flow (Detailed)

This replaces the `IsFirstLogin` logic from the original spec with a simpler, more flexible mechanism.

```
Admin creates a new user:
  → fills in Full Name, Username, Email, Role, and a Temp Password in the Add User form
  → backend saves the user with TempPass = true
  → no extra setup step needed

User logs in with the temp password:
  → backend validates password (**BCrypt**), returns { token, role, name, tempPass: true }; JWT includes **must_change_password** for middleware
  → frontend stores all of this via `setAuth` (Auth Context + `localStorage`)
  → LoginPage stays mounted on /login and shows the new-password step
  → route guard detects tempPass = true
  → **TempPassMiddleware** returns 403 for any API other than change-password until the password is updated
  → any navigation away redirects back to /login (password step)
  → user cannot use the rest of the app until they complete this step

User sets their new password on LoginPage (step 2):
  → POST /api/auth/change-password with { newPassword }
  → backend saves new **hash**, sets TempPass = false
  → frontend calls `markPasswordChanged()` (Context + `localStorage`)
  → navigates to their role's dashboard

Admin resets a user's password at any time later:
  → PATCH /api/users/{id}/reset-password with { tempPassword }
  → backend hashes and saves the new temp password, sets TempPass = true
  → the next time that user logs in, the same flow forces them to change it again
```

**Why this is better than IsFirstLogin:**
- Works for both brand-new users and admin-initiated password resets — same flag, same flow
- No separate "first login detection" logic needed anywhere in the codebase
- `TempPass` marks that the user is still on a temp password and must complete password change on `LoginPage` (step 2) before using the app
- Admin can force any user to pick a new password at any time simply by resetting it
- **Server-side middleware** ensures the rule cannot be bypassed with a REST client

---

## 8. Report Background Job + Polling

```
Analyst clicks Generate:
  → POST /api/reports/generate with { reportType, filters }
  → ReportService.Queue() saves a Reports row (Status = PROCESSING)
  → Returns the new report ID to the frontend immediately (fast — no waiting for data)
  → **IHostedService** / queue picks up the report ID and runs `ProcessReport` inside a **new DI scope** (`IServiceScopeFactory`)

Background worker (ProcessReport):
  → Reads the report's filter JSON from the database
  → Queries PaymentRequests applying all filters via dynamic LINQ
  → Groups and aggregates the results by the selected report type
  → Writes **ReportResultJson**, marks Status = READY, sets CompletedAt = DateTime.UtcNow
  → On any exception: marks Status = FAILED

Frontend polling (ReportListPage.jsx):
  → Adds the new row to the table immediately with Status = PROCESSING
  → setInterval every 3 seconds calls GET /api/reports/{id} for each PROCESSING row
  → When Status becomes READY: enables the Download button, clears the interval for that row
  → When Status becomes FAILED: shows an error badge, clears the interval for that row

Download:
  → GET /api/reports/{id}/download
  → Backend returns **ReportResultJson** (same payload generated at READY time)
  → Frontend displays or saves the data (PDF file added in future — §12)
```

---

## 9. 5-Day Task Plan

### Phase 1 — Setup (Days 1–2)

**Goal:** Project scaffolded, JWT auth working end-to-end, database migrated with seed data.

| Day | Task |
|-----|------|
| 1 | Create .NET 8 Web API project in `backend/`, configure EF Core, write `AppDbContext.cs`, set up connection string to **VenDot** (§0) in `appsettings.json` |
| 1 | Write `Role.cs` and `User.cs` models (`PasswordHash`, BCrypt). Run first migration. Ensure roles (and baseline reference data) via migrations/`HasData`. Add optional `Seeder.cs` for dev: demo Admin user (`TempPass = false`, hashed password) — gated in `Program.cs`, removable for prod |
| 1 | Build `AuthController.cs` + `AuthService.cs`: login with **BCrypt.Verify**, JWT includes `must_change_password`; change-password hashes new password and clears `TempPass`; add **TempPassMiddleware** |
| 1 | Scaffold Vite + React project in `frontend/`, install packages (axios, react-router-dom), configure TailwindCSS |
| 1 | Set up `main.jsx` with `AuthProvider`, write `AuthContext.jsx` (`useAuth`, `localStorage` sync), write `api/http.js` with JWT interceptor (`getAuthToken` or registered clear handler) |
| 2 | Build `LoginPage.jsx` wired to real auth API via `useAuth()`; when `tempPass`, show new-password step on same page, call change-password API, `markPasswordChanged()`, then redirect to role dashboard |
| 2 | Build `Layout.jsx` (navbar + role-based sidebar), `StatusBadge.jsx`, `DataTable.jsx`, `Modal.jsx` |
| 2 | Write `Vendor.cs`, `VendorBankAccount.cs`, `TaxType.cs` models → run migration → TaxTypes via `HasData`/migration (not only `Seeder`) |
| 2 | Write `PaymentRequest.cs`, `PaymentItem.cs`, `Report.cs` models → run final setup migration |

### Phase 2 — Core Build (Days 3–4)

**Goal:** All four role workflows functional with real data from the database.

| Day | Task |
|-----|------|
| 3 | Build `VendorController.cs` + `VendorService.cs`: all GET/POST/PUT/PATCH deactivate endpoints |
| 3 | Build `VendorListPage.jsx` and vendor Add/Edit modal — wired to the vendor API |
| 3 | Build `PaymentController.cs` + `PaymentService.cs`: POST create accepts vendor + all line items + tax in one request body; all calculations done server-side |
| 3 | Build GET `/api/payments` (role-filtered) and GET `/api/payments/{id}` with full detail including items |
| 3 | Build `ReportController.cs` + `ReportService.cs`: Queue saves PROCESSING row, enqueues to **IHostedService** worker, returns the report ID |
| 3 | Implement `ProcessReport` for the Summary report type — query, aggregate, write **ReportResultJson**, mark READY |
| 3 | Build `VendorPicker.jsx` — searchable dropdown loading from GET /api/vendors |
| 3 | Build `LineItemsTable.jsx` — add/remove rows, auto Line Total per row, auto Subtotal |
| 3 | Build `TaxPicker.jsx` — preset dropdown + custom rate input, auto Tax Amount |
| 4 | Build all bank account endpoints: GET/POST/PUT per vendor; PATCH set-default |
| 4 | Build `BankAccountPage.jsx` — navigated to from the vendor list |
| 4 | Build POST `/api/payments/{id}/approve` and `/api/payments/{id}/reject` with note and timestamp |
| 4 | Implement remaining report types in ProcessReport: ByVendor, ByStatus, ByAccountant, ByMonth |
| 4 | Build GET `/api/reports/{id}` for status polling; GET `/api/reports/{id}/download` returns stored **ReportResultJson** |
| 4 | Build `PaymentFormPage.jsx`: full form assembling all three components + Grand Total preview |
| 4 | Build `PaymentListPage.jsx`: accountant request list with status badges, click to view detail |
| 4 | Build `ManagerDashboard.jsx` + `PaymentDetailPage.jsx`: pending list + approve/reject buttons + review note |
| 4 | Build `UserListPage.jsx`: user list, add with temp password, edit, deactivate, reset password |

### Phase 3 — Finish (Day 5)

**Goal:** Reports fully live with polling, all screens polished, end-to-end tested, demo ready.

| Task |
|------|
| Build `ReportListPage.jsx`: full filter panel, generate button, 3-second polling loop, Download button appears when READY |
| Build `AdminDashboard.jsx`, `AccountantDashboard.jsx`, `AnalystDashboard.jsx` summary cards |
| Wire Admin reports view on `AdminDashboard.jsx` — list all reports with Download |
| Security audit: verify every endpoint has the correct `[Authorize(Roles = "...")]`. Test each endpoint with a wrong-role JWT and confirm 403 is returned. Fix any gaps. |
| End-to-end test: create payment request with line items → manager approves → analyst applies filters → generates report → downloads it |
| Bug fixes, UI polish, load optional demo data via `Seeder` (dev only), rehearse demo walkthrough |

---

## 10. API Endpoint Summary

### Auth
| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| POST | /api/auth/login | All | Login → JWT token + role + name + tempPass flag |
| POST | /api/auth/change-password | All (JWT required) | Save new password, clear TempPass |

### Users (Admin only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create user (TempPass automatically set to true) |
| PUT | /api/users/{id} | Update name, email, role |
| PATCH | /api/users/{id}/deactivate | Disable account |
| PATCH | /api/users/{id}/reset-password | Set new temp password — forces password change on next login |

### Vendors
| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| GET | /api/vendors | Admin, Accountant | List active vendors |
| POST | /api/vendors | Admin | Register vendor |
| PUT | /api/vendors/{id} | Admin | Edit vendor details |
| PATCH | /api/vendors/{id}/deactivate | Admin | Archive vendor (hidden from dropdowns) |
| GET | /api/vendors/{id}/accounts | Admin | List bank accounts for the vendor |
| POST | /api/vendors/{id}/accounts | Admin | Add bank account |
| PUT | /api/vendors/{id}/accounts/{accountId} | Admin | Edit bank account |
| PATCH | /api/vendors/{id}/accounts/{accountId}/default | Admin | Set as default account |

### Tax Types
| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| GET | /api/tax-types | All | List active tax types for dropdown |

### Payments
| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| GET | /api/payments | Accountant, Manager | Role-filtered list |
| POST | /api/payments | Accountant | Create request with line items and tax |
| GET | /api/payments/{id} | Accountant, Manager | Full detail with vendor, items, tax breakdown |
| POST | /api/payments/{id}/approve | Manager | Approve with optional note |
| POST | /api/payments/{id}/reject | Manager | Reject with optional note |

### Reports
| Method | Route | Roles | Description |
|--------|-------|-------|-------------|
| POST | /api/reports/generate | Analyst | Queue report, return ID immediately |
| GET | /api/reports | Analyst, Admin | List reports |
| GET | /api/reports/{id} | Analyst, Admin | Status check for polling (every 3s) |
| GET | /api/reports/{id}/download | Analyst, Admin | Download report data |

---

## 11. Key Implementation Notes

### Calculations Always Server-Side
Never trust frontend-calculated totals. `PaymentService.Create` always recalculates `LineTotal`, `SubTotal`, `TaxAmount`, and `TotalAmount` from the raw items sent in the request before saving anything to the database.

### JWT Role Enforcement
Every protected controller method has `[Authorize(Roles = "...")]` specifying exactly which roles are allowed. The backend validates the role claim from the JWT on every API call. Frontend role checks only control which pages are visible in the UI — they are never the actual security boundary.

### Vendor Deactivation
Deactivated vendors are excluded from the `VendorPicker` dropdown (GET /api/vendors only returns `IsActive = true` records). They remain on existing payment records so historical data is never broken.

### Custom Tax Rate
When an accountant enters a custom rate, `TaxTypeId` is saved as null and `TaxRate` stores the entered decimal value. All queries, report aggregations, and detail views handle this null case.

### Report Data Format
Downloads return **`ReportResultJson`** saved when the report reached READY (not a live re-query). Each payload contains grouped and totalled rows for the selected report type. PDF generation is a future enhancement (see §12).

### Payment create validation
At least one line item; quantity and unit price **> 0**; `vendorBankAccountId` must belong to `vendorId`; totals recomputed server-side only.

### Bank account default rule
`VendorService.SetDefault` must run in a transaction: one default per vendor.

### Simple State Management
**Auth Context** holds only: `token`, `role`, `name`, `tempPass` (synced to `localStorage` for refresh). All other application data (vendor lists, payment details, report results) is fetched fresh from the API per page load and kept in local component state. No extra global store library is needed.

### Error Handling
- Backend: `ErrorHandler.cs` middleware catches all unhandled exceptions and returns `{ "error": "message" }` with the appropriate HTTP status code
- Frontend: the axios interceptor in `http.js` catches 4xx/5xx and surfaces the API `error` message (e.g. shared `ErrorContext` + banner in `Layout`, or handlers passed from pages); a 401 runs the registered session clear (Context + `localStorage`) and redirects to `/login`

---

## 12. Future Enhancements

These items are optional follow-ons after the capstone core is complete.

### PDF Export for Reports
Currently the download endpoint returns **JSON** from `ReportResultJson`. To add PDF generation later:

1. Install package: `dotnet add package QuestPDF`
2. Add `FilePath NVARCHAR(500)` column to the `Reports` table and run a migration
3. In `ReportService.ProcessReport`: after building aggregated data (and `ReportResultJson`), optionally build a PDF with QuestPDF, save to `wwwroot/reports/rpt_{id}.pdf`, store path in `Reports.FilePath`
4. Update `ReportService.Download` to prefer `FilePath` when present, else return JSON
5. Update the frontend `reportApi.downloadReport` to trigger a file download when content-type is PDF

The **background worker** (PROCESSING → READY, `ReportResultJson`, 3-second polling) stays the same — add PDF as an extra output format.

---

## 13. Seed Data for Demo

Values below are for **local/demo** when `Seeder` runs (or manual insert). They are **not** a hard requirement for production; remove `Seeder` in prod and provision data your own way.

| Data | Values |
|------|--------|
| Admin user | Username: `admin` · Password: `Admin123` in **plain text for demo only** — seeder must store **`BCrypt.HashPassword("Admin123")`** in `PasswordHash` · TempPass: false |
| Roles | Admin, Accountant, Manager, Analyst |
| Tax types | None 0%, GST 10%, VAT 15%, WHT 5% |
| Demo vendors | 3 vendors each with 1 bank account marked as default |
| Demo users | 1 Accountant, 1 Manager, 1 Analyst — all with temp passwords, TempPass: true |

---

## 14. Future Changes (Known Limitations)

These are intentional gaps for the capstone scope; treat them as follow-on work if you need a production-grade system.

| Area | Limitation |
|------|------------|
| **Authentication** | No refresh tokens — JWTs expire per `Jwt:ExpireHours`; clients must log in again when expired. |
| **List APIs** | No pagination on list endpoints (users, vendors, payments, reports) — large datasets may be slow or heavy. |
| **Report jobs** | Report queue is in-process (in-memory channel). Jobs are **not** durable across API restarts; a restart can lose queued work. |
| **Secrets & production** | `Jwt:Secret` must be a strong value and supplied via user secrets, environment variables, or a vault — never ship a weak or committed secret to production. |
| **Report exports** | Download returns **JSON** only unless you implement PDF (see §12). No Excel/CSV export in the core build. |

Related: connection string and SQL instance setup are covered in **§0** and **§5.2**; JWT role claim configuration is described in **§5.3**.