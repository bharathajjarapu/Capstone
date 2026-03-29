using Microsoft.EntityFrameworkCore;
using VenDot.Models;

namespace VenDot.Data;

public static class Seeder
{
    public static async Task SeedDemoAdminAsync(AppDBContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(u => u.Username == "admin", cancellationToken))
            return;

        var adminRole = await db.Roles.FirstAsync(r => r.Name == "Admin", cancellationToken);
        var user = new User
        {
            FullName = "Demo Admin",
            Username = "admin",
            Email = "admin@vendot.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            TempPass = false,
            IsActive = true,
            RoleId = adminRole.Id
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded demo admin user (admin / Admin123!)");
    }
}
