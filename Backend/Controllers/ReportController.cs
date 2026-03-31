using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.DTOs;
using VenDot.Services;
using VenDot.Utils;

namespace VenDot.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Analyst,Admin")]
public class ReportController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportController(ReportService reportService)
    {
        _reportService = reportService;
    }

    private int UserId => int.Parse(User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    private string Role => User.FindFirstValue("role") ?? "";

    [HttpPost("generate")]
    [Authorize(Roles = "Analyst")]
    public async Task<IActionResult> Generate([FromBody] GenerateReportRequest request, CancellationToken cancellationToken)
    {
        var id = await _reportService.QueueAsync(request, UserId, cancellationToken);
        return Ok(new { id });
    }

    [HttpPost("preview")]
    [Authorize(Roles = "Analyst")]
    public async Task<IActionResult> Preview([FromBody] PreviewReportRequest? request, CancellationToken cancellationToken)
    {
        var result = await _reportService.PreviewAsync(request?.Filters, cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var list = await _reportService.GetAllAsync(UserId, Role, cancellationToken);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var r = await _reportService.GetByIdAsync(id, UserId, Role, cancellationToken);
        if (r == null) return NotFound();
        return Ok(r);
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id, [FromQuery] string? format, CancellationToken cancellationToken)
    {
        var fmt = (format ?? "pdf").Trim().ToLowerInvariant();
        if (fmt is not ("pdf" or "xlsx")) return BadRequest(new { error = "format must be pdf or xlsx" });

        var report = await _reportService.GetByIdAsync(id, UserId, Role, cancellationToken);
        if (report == null || report.Status != "READY" || string.IsNullOrEmpty(report.ReportResultJson)) return NotFound();

        var rows = await _reportService.GetExportRowsForReportAsync(report, cancellationToken);

        return fmt switch
        {
            "pdf" => File(
                ReportExportHelper.ToPdfPaymentTable(report.Name, report.ReportType, report.Id, rows),
                "application/pdf",
                BuildDownloadFileName(report.Name, report.Id, "pdf")),
            "xlsx" => File(
                ReportExportHelper.ToXlsxPaymentTable(report.Name, report.ReportType, report.Id, rows),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                BuildDownloadFileName(report.Name, report.Id, "xlsx")),
            _ => BadRequest()
        };
    }

    private static string BuildDownloadFileName(string? reportName, int reportId, string ext)
    {
        var baseName = string.IsNullOrWhiteSpace(reportName)
            ? $"report_{reportId}"
            : $"{SanitizeFileNameSegment(reportName)}_{reportId}";
        return $"{baseName}.{ext}";
    }

    private static string SanitizeFileNameSegment(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder();
        foreach (var c in name.Trim())
        {
            if (invalid.Contains(c) || c < 32) sb.Append('_');
            else if (char.IsWhiteSpace(c)) sb.Append('_');
            else sb.Append(c);
        }
        var s = sb.ToString().Trim('_');
        return string.IsNullOrEmpty(s) ? "report" : s;
    }
}
