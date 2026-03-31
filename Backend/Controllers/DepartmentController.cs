using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VenDot.Services;

namespace VenDot.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public class DepartmentController : ControllerBase
{
    private readonly DepartmentService _departmentService;

    public DepartmentController(DepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActive(CancellationToken cancellationToken)
    {
        var list = await _departmentService.GetActiveAsync(cancellationToken);
        return Ok(list);
    }
}
