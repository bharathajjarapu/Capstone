namespace VenDot.DTOs;

public class UserCreateResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    /// <summary>Plain temp password shown once to the admin.</summary>
    public string GeneratedTempPassword { get; set; } = string.Empty;
}
