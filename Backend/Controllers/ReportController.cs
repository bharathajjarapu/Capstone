using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.DTOs;
using VenDot.Services;

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
    public async Task<IActionResult> Download(int id, CancellationToken cancellationToken)
    {
        var json = await _reportService.DownloadAsync(id, UserId, Role, cancellationToken);
        if (json == null) return NotFound();
        return Content(json, "application/json");
    }
}
