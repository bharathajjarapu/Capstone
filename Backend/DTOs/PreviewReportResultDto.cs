namespace VenDot.DTOs;

public class PreviewReportResultDto
{
    public int TotalCount { get; set; }
    public List<PaymentPreviewRowDto> Items { get; set; } = new();
}
