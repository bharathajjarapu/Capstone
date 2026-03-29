using Microsoft.EntityFrameworkCore;
using VenDot.Data;
using VenDot.DTOs;
using VenDot.Models;

namespace VenDot.Services;

public class VendorService
{
    private readonly AppDBContext _db;

    public VendorService(AppDBContext db)
    {
        _db = db;
    }

    public async Task<List<Vendor>> GetAllActiveAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Vendors.Where(v => v.IsActive).OrderBy(v => v.Name).ToListAsync(cancellationToken);
    }

    public async Task<Vendor?> CreateAsync(CreateVendorRequest request, CancellationToken cancellationToken = default)
    {
        var vendor = new Vendor
        {
            Name = request.Name,
            ContactName = request.ContactName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync(cancellationToken);
        return vendor;
    }

    public async Task<Vendor?> UpdateAsync(int id, CreateVendorRequest request, CancellationToken cancellationToken = default)
    {
        var vendor = await _db.Vendors.FindAsync(new object[] { id }, cancellationToken);
        if (vendor == null) return null;
        vendor.Name = request.Name;
        vendor.ContactName = request.ContactName;
        vendor.Email = request.Email;
        vendor.Phone = request.Phone;
        vendor.Address = request.Address;
        await _db.SaveChangesAsync(cancellationToken);
        return vendor;
    }

    public async Task<bool> DeactivateAsync(int id, CancellationToken cancellationToken = default)
    {
        var vendor = await _db.Vendors.FindAsync(new object[] { id }, cancellationToken);
        if (vendor == null) return false;
        vendor.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<VendorBankAccount>> GetAccountsAsync(int vendorId, CancellationToken cancellationToken = default)
    {
        return await _db.VendorBankAccounts.Where(a => a.VendorId == vendorId).OrderByDescending(a => a.IsDefault).ThenBy(a => a.Id).ToListAsync(cancellationToken);
    }

    public async Task<VendorBankAccount?> AddAccountAsync(int vendorId, BankAccountRequest request, CancellationToken cancellationToken = default)
    {
        if (!await _db.Vendors.AnyAsync(v => v.Id == vendorId, cancellationToken)) return null;
        var account = new VendorBankAccount
        {
            VendorId = vendorId,
            BankName = request.BankName,
            AccountName = request.AccountName,
            AccountNo = request.AccountNo,
            RoutingNo = request.RoutingNo,
            SwiftCode = request.SwiftCode,
            IsDefault = request.IsDefault
        };
        if (request.IsDefault)
            await ClearDefaultForVendorAsync(vendorId, cancellationToken);
        _db.VendorBankAccounts.Add(account);
        await _db.SaveChangesAsync(cancellationToken);
        return account;
    }

    public async Task<VendorBankAccount?> UpdateAccountAsync(int vendorId, int accountId, BankAccountRequest request, CancellationToken cancellationToken = default)
    {
        var account = await _db.VendorBankAccounts.FirstOrDefaultAsync(a => a.Id == accountId && a.VendorId == vendorId, cancellationToken);
        if (account == null) return null;
        account.BankName = request.BankName;
        account.AccountName = request.AccountName;
        account.AccountNo = request.AccountNo;
        account.RoutingNo = request.RoutingNo;
        account.SwiftCode = request.SwiftCode;
        if (request.IsDefault && !account.IsDefault)
        {
            await ClearDefaultForVendorAsync(vendorId, cancellationToken);
            account.IsDefault = true;
        }
        else if (!request.IsDefault)
            account.IsDefault = false;
        await _db.SaveChangesAsync(cancellationToken);
        return account;
    }

    public async Task<bool> SetDefaultAsync(int vendorId, int accountId, CancellationToken cancellationToken = default)
    {
        var account = await _db.VendorBankAccounts.FirstOrDefaultAsync(a => a.Id == accountId && a.VendorId == vendorId, cancellationToken);
        if (account == null) return false;
        await ClearDefaultForVendorAsync(vendorId, cancellationToken);
        account.IsDefault = true;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task ClearDefaultForVendorAsync(int vendorId, CancellationToken cancellationToken)
    {
        var accounts = await _db.VendorBankAccounts.Where(a => a.VendorId == vendorId && a.IsDefault).ToListAsync(cancellationToken);
        foreach (var a in accounts) a.IsDefault = false;
    }
}
