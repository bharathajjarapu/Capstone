namespace VenDot.Models;

public class PaymentItem
{
    public int Id { get; set; }
    public int PaymentRequestId { get; set; }
    public PaymentRequest? PaymentRequest { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
