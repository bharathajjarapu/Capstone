using System.ComponentModel.DataAnnotations;

namespace VenDot.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    [MaxLength(450)]
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool TempPass { get; set; }
    public bool IsActive { get; set; } = true;
    public int RoleId { get; set; }
    public Role? Role { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
}
