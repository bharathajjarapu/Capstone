namespace VenDot.DTOs;

public class CreateUserRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    /// <summary>Optional. If empty, the server generates a secure temp password.</summary>
    public string? TempPassword { get; set; }
}
