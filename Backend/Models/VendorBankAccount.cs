namespace VenDot.Models;

public class VendorBankAccount
{
    public int Id { get; set; }
    public int VendorId { get; set; }
    public Vendor? Vendor { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNo { get; set; } = string.Empty;
    public string RoutingNo { get; set; } = string.Empty;
    public string? SwiftCode { get; set; }
    public bool IsDefault { get; set; }
}
