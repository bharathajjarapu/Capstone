namespace VenDot.DTOs;

public class GenerateReportRequest
{
    public string ReportType { get; set; } = string.Empty;
    public ReportFilters? Filters { get; set; }
}
