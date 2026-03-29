using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.DTOs;
using VenDot.Services;

namespace VenDot.Controllers;

[ApiController]
[Route("api/vendors")]
[Authorize]
public class VendorController : ControllerBase
{
    private readonly VendorService _vendorService;

    public VendorController(VendorService vendorService)
    {
        _vendorService = vendorService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Accountant,Analyst")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var list = await _vendorService.GetAllActiveAsync(cancellationToken);
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateVendorRequest request, CancellationToken cancellationToken)
    {
        var v = await _vendorService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = v!.Id }, v);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateVendorRequest request, CancellationToken cancellationToken)
    {
        var v = await _vendorService.UpdateAsync(id, request, cancellationToken);
        if (v == null) return NotFound();
        return Ok(v);
    }

    [HttpPatch("{id:int}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        if (!await _vendorService.DeactivateAsync(id, cancellationToken)) return NotFound();
        return NoContent();
    }

    [HttpGet("{id:int}/accounts")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> GetAccounts(int id, CancellationToken cancellationToken)
    {
        var list = await _vendorService.GetAccountsAsync(id, cancellationToken);
        return Ok(list);
    }

    [HttpPost("{id:int}/accounts")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddAccount(int id, [FromBody] BankAccountRequest request, CancellationToken cancellationToken)
    {
        var a = await _vendorService.AddAccountAsync(id, request, cancellationToken);
        if (a == null) return NotFound();
        return CreatedAtAction(nameof(GetAccounts), new { id }, a);
    }

    [HttpPut("{id:int}/accounts/{accountId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAccount(int id, int accountId, [FromBody] BankAccountRequest request, CancellationToken cancellationToken)
    {
        var a = await _vendorService.UpdateAccountAsync(id, accountId, request, cancellationToken);
        if (a == null) return NotFound();
        return Ok(a);
    }

    [HttpPatch("{id:int}/accounts/{accountId:int}/default")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetDefault(int id, int accountId, CancellationToken cancellationToken)
    {
        if (!await _vendorService.SetDefaultAsync(id, accountId, cancellationToken)) return NotFound();
        return NoContent();
    }
}
