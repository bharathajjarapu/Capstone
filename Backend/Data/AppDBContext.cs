using Microsoft.EntityFrameworkCore;
using VenDot.Models;

namespace VenDot.Data;

public class AppDBContext : DbContext
{
    public AppDBContext(DbContextOptions<AppDBContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<VendorBankAccount> VendorBankAccounts => Set<VendorBankAccount>();
    public DbSet<TaxType> TaxTypes => Set<TaxType>();
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<PaymentItem> PaymentItems => Set<PaymentItem>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.Email).HasMaxLength(450);
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
            e.HasOne(u => u.Role).WithMany(r => r.Users).HasForeignKey(u => u.RoleId);
            e.HasOne(u => u.Department).WithMany(d => d.Users).HasForeignKey(u => u.DepartmentId).OnDelete(DeleteBehavior.Restrict);
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
            e.HasOne(p => p.Department).WithMany(d => d.PaymentRequests).HasForeignKey(p => p.DepartmentId).OnDelete(DeleteBehavior.Restrict);
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
