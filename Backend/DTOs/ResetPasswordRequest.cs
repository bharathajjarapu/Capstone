namespace VenDot.DTOs;

public class ResetPasswordRequest
{
    /// <summary>Optional. If empty, the server generates a secure temp password.</summary>
    public string? TempPassword { get; set; }
}
