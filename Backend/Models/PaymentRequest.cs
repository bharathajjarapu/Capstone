namespace VenDot.Models;

public class PaymentRequest
{
    public int Id { get; set; }
    public int VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public int VendorBankAccountId { get; set; }
    public VendorBankAccount? VendorBankAccount { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string SnapshotBankName { get; set; } = string.Empty;
    public string SnapshotAccountName { get; set; } = string.Empty;
    public string SnapshotAccountNo { get; set; } = string.Empty;
    public string SnapshotRoutingNo { get; set; } = string.Empty;
    public string? SnapshotSwiftCode { get; set; }
    public decimal SubTotal { get; set; }
    public int? TaxTypeId { get; set; }
    public TaxType? TaxType { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateOnly DueDate { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? Notes { get; set; }
    public int SubmittedById { get; set; }
    public User? SubmittedBy { get; set; }
    public int? ReviewedById { get; set; }
    public User? ReviewedBy { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public ICollection<PaymentItem> Items { get; set; } = new List<PaymentItem>();
}
