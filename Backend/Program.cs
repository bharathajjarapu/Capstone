// Product routes, roles, and workflows: Readme.md at repo root is the source of truth.
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VenDot.Data;
using VenDot.HostedWorkers;
using VenDot.Middleware;
using VenDot.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<VendorService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<ReportService>();

builder.Services.AddSingleton<ReportJobQueue>();
builder.Services.AddSingleton<IReportJobQueue>(sp => sp.GetRequiredService<ReportJobQueue>());
builder.Services.AddHostedService<ReportBackgroundWorker>();

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is required.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "vendot";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "vendot";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlerMiddleware>();
app.UseHttpsRedirection();
app.UseCors("DevFrontend");
app.UseAuthentication();
app.UseMiddleware<TempPassMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new { message = "VenDot backend is running." }))
    .AllowAnonymous();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDBContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (SqlException ex)
    {
        startupLogger.LogCritical(ex, "Database migration failed: cannot connect or migrate.");
        Console.Error.WriteLine();
        Console.Error.WriteLine("=== VenDot: SQL Server connection failed (app will exit) ===");
        Console.Error.WriteLine("Checklist:");
        Console.Error.WriteLine("  1) SQL Server service is Running (e.g. services.msc -> SQL Server (SQLEXPRESS)).");
        Console.Error.WriteLine("  2) Database VenDot exists (see Readme.md section 0).");
        Console.Error.WriteLine("  3) Connection string matches YOUR instance:");
        Console.Error.WriteLine("     SQLEXPRESS: Server=localhost\\SQLEXPRESS;Database=VenDot;Trusted_Connection=True;TrustServerCertificate=True;");
        Console.Error.WriteLine("     LocalDB:    Server=(localdb)\\MSSQLLocalDB;Database=VenDot;Trusted_Connection=True;TrustServerCertificate=True;");
        Console.Error.WriteLine("  4) Override without editing files:");
        Console.Error.WriteLine("     set ConnectionStrings__DefaultConnection=<your connection string>");
        Console.Error.WriteLine();
        Console.Error.WriteLine("If you saw 'Local Database Runtime' / error 52: LocalDB is not installed — use SQLEXPRESS or install LocalDB.");
        Console.Error.WriteLine("If you saw error 26: wrong Server name — fix the instance name (sqlcmd -L lists instances).");
        Console.Error.WriteLine();
        Environment.ExitCode = 1;
        throw;
    }

}

app.Run();
