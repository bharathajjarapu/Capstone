using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.DTOs;
using VenDot.Services;

namespace VenDot.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = "Accountant,Manager")]
public class PaymentController : ControllerBase
{
    private readonly PaymentService _paymentService;

    public PaymentController(PaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    private int UserId => int.Parse(User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    private string Role => User.FindFirstValue("role") ?? "";

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var list = await _paymentService.GetAllAsync(UserId, Role, status, cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Accountant")]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var pr = await _paymentService.CreateAsync(request, UserId, cancellationToken);
        if (pr == null) return BadRequest(new { error = "Invalid payment data." });
        return CreatedAtAction(nameof(GetById), new { id = pr.Id }, pr);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var pr = await _paymentService.GetByIdAsync(id, UserId, Role, cancellationToken);
        if (pr == null) return NotFound();
        return Ok(pr);
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> Approve(int id, [FromBody] NoteRequest? body, CancellationToken cancellationToken)
    {
        var pr = await _paymentService.ApproveAsync(id, UserId, body?.Note, cancellationToken);
        if (pr == null) return BadRequest(new { error = "Cannot approve." });
        return Ok(pr);
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> Reject(int id, [FromBody] NoteRequest? body, CancellationToken cancellationToken)
    {
        var pr = await _paymentService.RejectAsync(id, UserId, body?.Note, cancellationToken);
        if (pr == null) return BadRequest(new { error = "Cannot reject." });
        return Ok(pr);
    }
}
