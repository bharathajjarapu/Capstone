namespace VenDot.DTOs;

public class PreviewReportResult
{
    public int TotalCount { get; set; }
    public List<PaymentPreviewRow> Items { get; set; } = new();
}
