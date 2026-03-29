using Microsoft.EntityFrameworkCore;
using VenDot.Data;
using VenDot.DTOs;
using VenDot.Models;

namespace VenDot.Services;

public class PaymentService
{
    private readonly AppDBContext _db;

    public PaymentService(AppDBContext db)
    {
        _db = db;
    }

    public async Task<List<PaymentRequest>> GetAllAsync(int userId, string role, string? statusFilter, CancellationToken cancellationToken = default)
    {
        var query = _db.PaymentRequests
            .Include(p => p.Vendor)
            .Include(p => p.SubmittedBy)
            .AsQueryable();

        if (role == "Accountant")
            query = query.Where(p => p.SubmittedById == userId);
        else if (role == "Manager")
        {
            if (statusFilter == "PENDING")
                query = query.Where(p => p.Status == "PENDING");
            else if (!string.IsNullOrEmpty(statusFilter))
                query = query.Where(p => p.Status == statusFilter);
        }

        return await query.OrderByDescending(p => p.SubmittedAt).ToListAsync(cancellationToken);
    }

    public async Task<PaymentRequest?> CreateAsync(CreatePaymentRequest request, int submittedById, CancellationToken cancellationToken = default)
    {
        if (request.Items == null || request.Items.Count == 0) return null;
        var vendor = await _db.Vendors.FindAsync(new object[] { request.VendorId }, cancellationToken);
        if (vendor == null || !vendor.IsActive) return null;

        var bank = await _db.VendorBankAccounts.FirstOrDefaultAsync(
            a => a.Id == request.VendorBankAccountId && a.VendorId == request.VendorId, cancellationToken);
        if (bank == null) return null;

        foreach (var item in request.Items)
        {
            if (item.Quantity <= 0 || item.UnitPrice <= 0) return null;
        }

        decimal subTotal = 0;
        var paymentItems = new List<VenDot.Models.PaymentItem>();
        foreach (var item in request.Items)
        {
            var lineTotal = Math.Round(item.Quantity * item.UnitPrice, 2, MidpointRounding.AwayFromZero);
            subTotal += lineTotal;
            paymentItems.Add(new VenDot.Models.PaymentItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = lineTotal
            });
        }

        decimal taxRate;
        int? taxTypeId = request.TaxTypeId;
        if (taxTypeId.HasValue)
        {
            var taxType = await _db.TaxTypes.FindAsync(new object[] { taxTypeId.Value }, cancellationToken);
            if (taxType == null || !taxType.IsActive) return null;
            taxRate = taxType.Rate;
        }
        else
        {
            if (!request.CustomTaxRate.HasValue) return null;
            taxRate = request.CustomTaxRate.Value;
            taxTypeId = null;
        }

        var taxAmount = Math.Round(subTotal * taxRate, 2, MidpointRounding.AwayFromZero);
        var totalAmount = subTotal + taxAmount;

        var pr = new PaymentRequest
        {
            VendorId = request.VendorId,
            VendorBankAccountId = bank.Id,
            InvoiceNo = request.InvoiceNo,
            SnapshotBankName = bank.BankName,
            SnapshotAccountName = bank.AccountName,
            SnapshotAccountNo = bank.AccountNo,
            SnapshotRoutingNo = bank.RoutingNo,
            SnapshotSwiftCode = bank.SwiftCode,
            SubTotal = subTotal,
            TaxTypeId = taxTypeId,
            TaxRate = taxRate,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            DueDate = request.DueDate,
            Status = "PENDING",
            Notes = request.Notes,
            SubmittedById = submittedById,
            SubmittedAt = DateTime.UtcNow,
            Items = paymentItems
        };
        _db.PaymentRequests.Add(pr);
        await _db.SaveChangesAsync(cancellationToken);
        return pr;
    }

    public async Task<PaymentRequest?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var pr = await _db.PaymentRequests
            .Include(p => p.Vendor)
            .Include(p => p.TaxType)
            .Include(p => p.SubmittedBy)
            .Include(p => p.ReviewedBy)
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (pr == null) return null;
        if (role == "Accountant" && pr.SubmittedById != userId) return null;
        return pr;
    }

    public async Task<PaymentRequest?> ApproveAsync(int id, int reviewedById, string? note, CancellationToken cancellationToken = default)
    {
        var pr = await _db.PaymentRequests.FindAsync(new object[] { id }, cancellationToken);
        if (pr == null || pr.Status != "PENDING") return null;
        pr.Status = "APPROVED";
        pr.ReviewedById = reviewedById;
        pr.ReviewNote = note;
        pr.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return pr;
    }

    public async Task<PaymentRequest?> RejectAsync(int id, int reviewedById, string? note, CancellationToken cancellationToken = default)
    {
        var pr = await _db.PaymentRequests.FindAsync(new object[] { id }, cancellationToken);
        if (pr == null || pr.Status != "PENDING") return null;
        pr.Status = "REJECTED";
        pr.ReviewedById = reviewedById;
        pr.ReviewNote = note;
        pr.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return pr;
    }
}
