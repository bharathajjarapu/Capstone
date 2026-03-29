namespace VenDot.DTOs;

public class ResetPasswordResponse
{
    /// <summary>Plain temp password shown once to the admin.</summary>
    public string GeneratedTempPassword { get; set; } = string.Empty;
}
