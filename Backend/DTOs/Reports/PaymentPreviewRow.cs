namespace VenDot.DTOs;

public class PaymentPreviewRow
{
    public int Id { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string VendorName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateOnly DueDate { get; set; }
    public string SubmittedByName { get; set; } = string.Empty;
    public string? TaxTypeName { get; set; }
}
