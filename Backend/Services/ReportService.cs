using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VenDot.Data;
using VenDot.DTOs;
using VenDot.Models;

namespace VenDot.Services;

public class ReportService
{
    private readonly AppDBContext _db;
    private readonly IReportJobQueue _queue;

    public ReportService(AppDBContext db, IReportJobQueue queue)
    {
        _db = db;
        _queue = queue;
    }

    public async Task<int> QueueAsync(GenerateReportRequest request, int generatedById, CancellationToken cancellationToken = default)
    {
        var filterJson = JsonSerializer.Serialize(request.Filters ?? new ReportFiltersDto());
        var report = new Report
        {
            ReportType = request.ReportType,
            FilterJson = filterJson,
            GeneratedById = generatedById,
            Status = "PROCESSING",
            RequestedAt = DateTime.UtcNow
        };
        _db.Reports.Add(report);
        await _db.SaveChangesAsync(cancellationToken);
        await _queue.EnqueueAsync(report.Id, cancellationToken);
        return report.Id;
    }

    public async Task ProcessReportAsync(int reportId, CancellationToken cancellationToken = default)
    {
        var report = await _db.Reports.FindAsync(new object[] { reportId }, cancellationToken);
        if (report == null) return;

        try
        {
            var filters = JsonSerializer.Deserialize<ReportFiltersDto>(report.FilterJson) ?? new ReportFiltersDto();
            var query = ApplyFilters(_db.PaymentRequests
                .Include(p => p.Vendor)
                .Include(p => p.SubmittedBy)
                .AsQueryable(), filters);

            var list = await query.ToListAsync(cancellationToken);
            object result = report.ReportType switch
            {
                "Summary" => new
                {
                    totalCount = list.Count,
                    totalValue = list.Sum(p => p.TotalAmount)
                },
                "ByVendor" => list
                    .GroupBy(p => p.Vendor!.Name)
                    .Select(g => new { vendorName = g.Key, count = g.Count(), totalValue = g.Sum(x => x.TotalAmount) })
                    .ToList(),
                "ByStatus" => list
                    .GroupBy(p => p.Status)
                    .Select(g => new { status = g.Key, count = g.Count(), totalValue = g.Sum(x => x.TotalAmount) })
                    .ToList(),
                "ByAccountant" => list
                    .GroupBy(p => p.SubmittedBy!.FullName)
                    .Select(g => new { accountantName = g.Key, count = g.Count(), totalValue = g.Sum(x => x.TotalAmount) })
                    .ToList(),
                "ByMonth" => list
                    .GroupBy(p => new { p.SubmittedAt.Year, p.SubmittedAt.Month })
                    .Select(g => new
                    {
                        year = g.Key.Year,
                        month = g.Key.Month,
                        count = g.Count(),
                        totalValue = g.Sum(x => x.TotalAmount)
                    })
                    .OrderBy(x => x.year).ThenBy(x => x.month)
                    .ToList(),
                _ => new { error = "Unknown report type" }
            };

            report.ReportResultJson = JsonSerializer.Serialize(result);
            report.Status = "READY";
            report.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            report.Status = "FAILED";
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    private static IQueryable<PaymentRequest> ApplyFilters(IQueryable<PaymentRequest> query, ReportFiltersDto f)
    {
        if (f.DateFrom.HasValue)
        {
            var start = f.DateFrom.Value.Date;
            query = query.Where(p => p.SubmittedAt >= start);
        }
        if (f.DateTo.HasValue)
        {
            var endExclusive = f.DateTo.Value.Date.AddDays(1);
            query = query.Where(p => p.SubmittedAt < endExclusive);
        }
        if (f.DueDateFrom.HasValue)
            query = query.Where(p => p.DueDate >= f.DueDateFrom.Value);
        if (f.DueDateTo.HasValue)
            query = query.Where(p => p.DueDate <= f.DueDateTo.Value);
        if (f.VendorIds is { Count: > 0 })
            query = query.Where(p => f.VendorIds.Contains(p.VendorId));
        if (f.Statuses is { Count: > 0 })
            query = query.Where(p => f.Statuses!.Contains(p.Status));
        if (f.SubmittedByIds is { Count: > 0 })
            query = query.Where(p => f.SubmittedByIds!.Contains(p.SubmittedById));
        if (f.ReviewedByIds is { Count: > 0 })
            query = query.Where(p => p.ReviewedById != null && f.ReviewedByIds!.Contains(p.ReviewedById.Value));
        if (f.MinAmount.HasValue)
            query = query.Where(p => p.TotalAmount >= f.MinAmount.Value);
        if (f.MaxAmount.HasValue)
            query = query.Where(p => p.TotalAmount <= f.MaxAmount.Value);
        if (f.TaxTypeIds is { Count: > 0 })
            query = query.Where(p => p.TaxTypeId != null && f.TaxTypeIds!.Contains(p.TaxTypeId.Value));
        return query;
    }

    public async Task<List<Report>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default)
    {
        var query = _db.Reports.Include(r => r.GeneratedBy).AsQueryable();
        if (role == "Analyst")
            query = query.Where(r => r.GeneratedById == userId);
        return await query.OrderByDescending(r => r.RequestedAt).ToListAsync(cancellationToken);
    }

    public async Task<Report?> GetByIdAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var r = await _db.Reports.Include(x => x.GeneratedBy).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (r == null) return null;
        if (role == "Analyst" && r.GeneratedById != userId) return null;
        return r;
    }

    public async Task<string?> DownloadAsync(int id, int userId, string role, CancellationToken cancellationToken = default)
    {
        var r = await GetByIdAsync(id, userId, role, cancellationToken);
        return r?.ReportResultJson;
    }
}
