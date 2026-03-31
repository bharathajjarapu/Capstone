namespace VenDot.DTOs;

public class CreatePaymentRequest
{
    /// <summary>Routes the request to managers in this department.</summary>
    public int DepartmentId { get; set; }
    public int VendorId { get; set; }
    public int VendorBankAccountId { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public DateOnly DueDate { get; set; }
    public int? TaxTypeId { get; set; }
    public decimal? CustomTaxRate { get; set; }
    public string? Notes { get; set; }
    public List<PaymentItem> Items { get; set; } = new();
}
