namespace VenDot.DTOs;

public class GenerateReportRequest
{
    public string? Name { get; set; }
    public string ReportType { get; set; } = string.Empty;
    public ReportFilters? Filters { get; set; }
}
