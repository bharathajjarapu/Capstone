using Microsoft.EntityFrameworkCore;
using VenDot.Models;

namespace VenDot.Data;

public class AppDBContext : DbContext
{
    public AppDBContext(DbContextOptions<AppDBContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<VendorBankAccount> VendorBankAccounts => Set<VendorBankAccount>();
    public DbSet<TaxType> TaxTypes => Set<TaxType>();
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<PaymentItem> PaymentItems => Set<PaymentItem>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin" },
            new Role { Id = 2, Name = "Accountant" },
            new Role { Id = 3, Name = "Manager" },
            new Role { Id = 4, Name = "Analyst" });

        modelBuilder.Entity<TaxType>().HasData(
            new TaxType { Id = 1, Name = "None", Rate = 0m, Description = "No tax", IsActive = true },
            new TaxType { Id = 2, Name = "GST", Rate = 0.10m, Description = "Goods and Services Tax 10%", IsActive = true },
            new TaxType { Id = 3, Name = "VAT", Rate = 0.15m, Description = "Value Added Tax 15%", IsActive = true },
            new TaxType { Id = 4, Name = "WHT", Rate = 0.05m, Description = "Withholding Tax 5%", IsActive = true });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasOne(u => u.Role).WithMany(r => r.Users).HasForeignKey(u => u.RoleId);
        });

        modelBuilder.Entity<VendorBankAccount>(e =>
        {
            e.HasOne(a => a.Vendor).WithMany(v => v.BankAccounts).HasForeignKey(a => a.VendorId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaxType>(e =>
        {
            e.Property(t => t.Rate).HasPrecision(5, 4);
        });

        modelBuilder.Entity<PaymentRequest>(e =>
        {
            e.Property(p => p.SubTotal).HasPrecision(18, 2);
            e.Property(p => p.TaxRate).HasPrecision(5, 4);
            e.Property(p => p.TaxAmount).HasPrecision(18, 2);
            e.Property(p => p.TotalAmount).HasPrecision(18, 2);
            e.HasOne(p => p.Vendor).WithMany(v => v.PaymentRequests).HasForeignKey(p => p.VendorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.VendorBankAccount).WithMany().HasForeignKey(p => p.VendorBankAccountId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.TaxType).WithMany().HasForeignKey(p => p.TaxTypeId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.SubmittedBy).WithMany().HasForeignKey(p => p.SubmittedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.ReviewedBy).WithMany().HasForeignKey(p => p.ReviewedById).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PaymentItem>(e =>
        {
            e.Property(i => i.Quantity).HasPrecision(10, 2);
            e.Property(i => i.UnitPrice).HasPrecision(18, 2);
            e.Property(i => i.LineTotal).HasPrecision(18, 2);
            e.HasOne(i => i.PaymentRequest).WithMany(p => p.Items).HasForeignKey(i => i.PaymentRequestId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Report>(e =>
        {
            e.HasOne(r => r.GeneratedBy).WithMany().HasForeignKey(r => r.GeneratedById).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
