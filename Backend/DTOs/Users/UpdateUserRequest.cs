namespace VenDot.DTOs;

public class UpdateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>Required when <see cref="Role"/> is Manager; cleared for other roles.</summary>
    public int? DepartmentId { get; set; }
}
