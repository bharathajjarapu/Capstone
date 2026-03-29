using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.DTOs;
using VenDot.Services;

namespace VenDot.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _userService.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<UserCreateResponse>> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var created = await _userService.CreateAsync(request, cancellationToken);
        if (created == null) return BadRequest(new { error = "Invalid role, duplicate username, or duplicate email." });
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserResponse>> Update(int id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var updated = await _userService.UpdateAsync(id, request, cancellationToken);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        if (!await _userService.DeactivateAsync(id, cancellationToken)) return NotFound();
        return NoContent();
    }

    /// <summary>Soft-delete: sets the user inactive (history preserved).</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        if (!await _userService.DeactivateAsync(id, cancellationToken)) return NotFound();
        return NoContent();
    }

    [HttpPatch("{id:int}/reset-password")]
    public async Task<ActionResult<ResetPasswordResponse>> ResetPassword(int id, [FromBody] ResetPasswordRequest? request, CancellationToken cancellationToken)
    {
        var result = await _userService.ResetPasswordAsync(id, request?.TempPassword, cancellationToken);
        if (result == null) return NotFound();
        return Ok(result);
    }
}
