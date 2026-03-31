using Microsoft.EntityFrameworkCore;
using VenDot.Data;
using VenDot.DTOs;
using VenDot.Models;
using VenDot.Utils;

namespace VenDot.Services;

public class UserService
{
    private readonly AppDBContext _db;

    public UserService(AppDBContext db)
    {
        _db = db;
    }

    public async Task<List<UserResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _db.Users
            .Include(u => u.Role)
            .Include(u => u.Department)
            .OrderBy(u => u.FullName)
            .Select(u => new UserResponse
            {
                Id = u.Id,
                FullName = u.FullName,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role!.Name,
                IsActive = u.IsActive,
                DepartmentId = u.DepartmentId,
                DepartmentName = u.Department != null ? u.Department.Name : null
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<UserCreateResponse?> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken);
        if (role == null) return null;
        if (await _db.Users.AnyAsync(u => u.Username == request.Username, cancellationToken)) return null;
        var emailNorm = EmailNormalizer.Normalize(request.Email);
        if (await _db.Users.AnyAsync(u => u.Email == emailNorm, cancellationToken)) return null;

        var plainTemp = string.IsNullOrWhiteSpace(request.TempPassword)
            ? PasswordGenerator.GenerateTemporaryPassword()
            : request.TempPassword!;

        int? departmentId = null;
        if (role.Name == "Manager")
        {
            if (!request.DepartmentId.HasValue) return null;
            var deptOk = await _db.Departments.AnyAsync(
                d => d.Id == request.DepartmentId.Value && d.IsActive, cancellationToken);
            if (!deptOk) return null;
            departmentId = request.DepartmentId.Value;
        }

        var user = new User
        {
            FullName = request.FullName,
            Username = request.Username,
            Email = emailNorm,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainTemp),
            TempPass = true,
            IsActive = true,
            RoleId = role.Id,
            DepartmentId = departmentId
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        var deptName = departmentId.HasValue
            ? await _db.Departments.Where(d => d.Id == departmentId.Value).Select(d => d.Name).FirstOrDefaultAsync(cancellationToken)
            : null;
        return new UserCreateResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Email = user.Email,
            Role = role.Name,
            IsActive = user.IsActive,
            DepartmentId = departmentId,
            DepartmentName = deptName,
            GeneratedTempPassword = plainTemp
        };
    }

    public async Task<UserResponse?> UpdateAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null) return null;
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == request.Role, cancellationToken);
        if (role == null) return null;
        var emailNorm = EmailNormalizer.Normalize(request.Email);
        if (await _db.Users.AnyAsync(u => u.Email == emailNorm && u.Id != id, cancellationToken)) return null;
        user.FullName = request.FullName;
        user.Email = emailNorm;
        user.RoleId = role.Id;
        if (role.Name == "Manager")
        {
            if (!request.DepartmentId.HasValue) return null;
            var deptOk = await _db.Departments.AnyAsync(
                d => d.Id == request.DepartmentId.Value && d.IsActive, cancellationToken);
            if (!deptOk) return null;
            user.DepartmentId = request.DepartmentId.Value;
        }
        else
        {
            user.DepartmentId = null;
        }
        await _db.SaveChangesAsync(cancellationToken);
        await _db.Entry(user).Reference(u => u.Department).LoadAsync(cancellationToken);
        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Username = user.Username,
            Email = user.Email,
            Role = role.Name,
            IsActive = user.IsActive,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name
        };
    }

    public async Task<bool> DeactivateAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null) return false;
        user.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ResetPasswordResponse?> ResetPasswordAsync(int id, string? tempPassword, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FindAsync(new object[] { id }, cancellationToken);
        if (user == null) return null;
        var plain = string.IsNullOrWhiteSpace(tempPassword)
            ? PasswordGenerator.GenerateTemporaryPassword()
            : tempPassword;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(plain);
        user.TempPass = true;
        await _db.SaveChangesAsync(cancellationToken);
        return new ResetPasswordResponse { GeneratedTempPassword = plain };
    }
}
