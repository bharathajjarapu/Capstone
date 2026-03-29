using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VenDot.Data;

namespace VenDot.Controllers;

[ApiController]
[Route("api/tax-types")]
[Authorize]
public class TaxController : ControllerBase
{
    private readonly AppDBContext _db;

    public TaxController(AppDBContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var list = await _db.TaxTypes.Where(t => t.IsActive).OrderBy(t => t.Id).ToListAsync(cancellationToken);
        return Ok(list);
    }
}
