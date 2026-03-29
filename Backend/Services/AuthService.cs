using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VenDot.Data;
using VenDot.DTOs;
using VenDot.Models;

namespace VenDot.Services;

public class AuthService
{
    private readonly AppDBContext _db;
    private readonly IConfiguration _configuration;

    public AuthService(AppDBContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> LoginAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        if (user == null || !user.IsActive) return null;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return null;

        var token = BuildToken(user);
        return new LoginResponse
        {
            Token = token,
            TempPass = user.TempPass,
            Role = user.Role?.Name ?? "",
            Name = user.FullName
        };
    }

    public async Task<LoginResponse?> ChangePasswordAsync(int userId, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return null;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.TempPass = false;
        await _db.SaveChangesAsync(cancellationToken);
        return new LoginResponse
        {
            Token = BuildToken(user),
            TempPass = false,
            Role = user.Role?.Name ?? "",
            Name = user.FullName
        };
    }

    private string BuildToken(User user)
    {
        var secret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var issuer = _configuration["Jwt:Issuer"] ?? "vendot";
        var audience = _configuration["Jwt:Audience"] ?? "vendot";
        var expireHours = int.TryParse(_configuration["Jwt:ExpireHours"], out var h) ? h : 8;

        var roleName = user.Role?.Name ?? "";
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new("userId", user.Id.ToString()),
            new("role", roleName),
            new(ClaimTypes.Role, roleName),
            new(ClaimTypes.Name, user.FullName),
            new("name", user.FullName),
            new("must_change_password", user.TempPass ? "true" : "false")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddHours(expireHours),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
