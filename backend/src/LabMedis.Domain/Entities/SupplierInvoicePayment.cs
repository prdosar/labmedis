using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class SupplierInvoicePayment : BaseEntity
{
    public long SupplierInvoiceId { get; set; }
    public SupplierInvoice? SupplierInvoice { get; set; }

    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentPath { get; set; }
}
