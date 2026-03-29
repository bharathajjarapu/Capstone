using System.Globalization;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using VenDot.DTOs;

namespace VenDot.Utils;

public static class ReportExportHelper
{
    static ReportExportHelper()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    private static readonly string[] TableHeaders =
    {
        "ID", "Invoice", "Vendor", "Status", "Amount", "Submitted", "Due", "Submitted by", "Tax"
    };

    public static byte[] ToPdfPaymentTable(string reportType, int reportId, IReadOnlyList<PaymentPreviewRowDto> rows)
    {
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Margin(20);
                page.Content().Column(column =>
                {
                    column.Spacing(10);
                    column.Item().Text($"Report: {reportType} (ID {reportId})").FontSize(14).SemiBold();
                    column.Item().Text($"Payments matching filters — {rows.Count} row(s)")
                        .FontSize(10).FontColor(Colors.Grey.Darken2);
                    column.Item().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                    column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                    if (rows.Count == 0)
                    {
                        column.Item().PaddingTop(12).Text("No payments matched the selected filters.").Italic();
                        return;
                    }

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(36);
                            c.RelativeColumn(1.1f);
                            c.RelativeColumn(1.8f);
                            c.RelativeColumn(0.9f);
                            c.RelativeColumn(0.85f);
                            c.RelativeColumn(1.35f);
                            c.RelativeColumn(0.75f);
                            c.RelativeColumn(1.2f);
                            c.RelativeColumn(0.65f);
                        });

                        table.Header(header =>
                        {
                            foreach (var h in TableHeaders)
                                header.Cell().Element(HeaderCell).Text(h).SemiBold().FontSize(8);
                        });

                        foreach (var r in rows)
                        {
                            table.Cell().Element(BodyCell).Text(r.Id.ToString(CultureInfo.InvariantCulture)).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.InvoiceNo).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.VendorName).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.Status).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.TotalAmount.ToString("F2", CultureInfo.InvariantCulture)).FontSize(7);
                            table.Cell().Element(BodyCell).Text(FormatSubmitted(r.SubmittedAt)).FontSize(7);
                            table.Cell().Element(BodyCell).Text(FormatDue(r.DueDate)).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.SubmittedByName).FontSize(7);
                            table.Cell().Element(BodyCell).Text(r.TaxTypeName ?? "—").FontSize(7);
                        }
                    });
                });
            });
        }).GeneratePdf();
    }

    public static byte[] ToXlsxPaymentTable(string reportType, int reportId, IReadOnlyList<PaymentPreviewRowDto> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Payments");
        ws.Cell(1, 1).Value = "Report type";
        ws.Cell(1, 2).Value = reportType;
        ws.Cell(2, 1).Value = "Report ID";
        ws.Cell(2, 2).Value = reportId;
        ws.Cell(3, 1).Value = "Rows (matching filters)";
        ws.Cell(3, 2).Value = rows.Count;
        ws.Cell(4, 1).Value = "Generated (UTC)";
        ws.Cell(4, 2).Value = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

        var headerRow = 6;
        for (var i = 0; i < TableHeaders.Length; i++)
            ws.Cell(headerRow, i + 1).Value = TableHeaders[i];

        var range = ws.Range(headerRow, 1, headerRow, TableHeaders.Length);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.LightGray;
        range.Style.Border.BottomBorder = XLBorderStyleValues.Thin;

        if (rows.Count == 0)
        {
            ws.Cell(headerRow + 1, 1).Value = "No payments matched the selected filters.";
        }
        else
        {
            var r = headerRow + 1;
            foreach (var row in rows)
            {
                ws.Cell(r, 1).Value = row.Id;
                ws.Cell(r, 2).Value = row.InvoiceNo;
                ws.Cell(r, 3).Value = row.VendorName;
                ws.Cell(r, 4).Value = row.Status;
                ws.Cell(r, 5).Value = row.TotalAmount;
                ws.Cell(r, 5).Style.NumberFormat.Format = "#,##0.00";
                ws.Cell(r, 6).Value = row.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                ws.Cell(r, 7).Value = row.DueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                ws.Cell(r, 8).Value = row.SubmittedByName;
                ws.Cell(r, 9).Value = row.TaxTypeName ?? "";
                r++;
            }

            ws.Columns().AdjustToContents();
        }

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    private static string FormatSubmitted(DateTime submittedAt) =>
        submittedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);

    private static string FormatDue(DateOnly dueDate) =>
        dueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static IContainer HeaderCell(IContainer c) =>
        c.BorderBottom(0.5f).BorderColor(Colors.Grey.Medium).PaddingVertical(4).PaddingHorizontal(3).Background(Colors.Grey.Lighten3);

    private static IContainer BodyCell(IContainer c) =>
        c.BorderBottom(0.25f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(3).PaddingHorizontal(3);
}
