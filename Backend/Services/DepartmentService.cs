using Microsoft.EntityFrameworkCore;
using VenDot.Data;
using VenDot.Models;

namespace VenDot.Services;

public class DepartmentService
{
    private readonly AppDBContext _db;

    public DepartmentService(AppDBContext db)
    {
        _db = db;
    }

    public async Task<List<Department>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Departments
            .Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);
    }
}
