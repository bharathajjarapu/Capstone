namespace VenDot.Models;

public class Report
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string ReportType { get; set; } = string.Empty;
    public string FilterJson { get; set; } = "{}";
    public string? ReportResultJson { get; set; }
    public int GeneratedById { get; set; }
    public User? GeneratedBy { get; set; }
    public string Status { get; set; } = "PROCESSING";
    public DateTime RequestedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
