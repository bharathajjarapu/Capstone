namespace VenDot.DTOs;

public class ReportFiltersDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public DateOnly? DueDateFrom { get; set; }
    public DateOnly? DueDateTo { get; set; }
    public List<int>? VendorIds { get; set; }
    public List<string>? Statuses { get; set; }
    public List<int>? SubmittedByIds { get; set; }
    public List<int>? ReviewedByIds { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public List<int>? TaxTypeIds { get; set; }
}
