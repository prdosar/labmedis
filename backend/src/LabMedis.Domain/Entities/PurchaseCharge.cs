using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class PurchaseCharge : BaseEntity
{
    public long PurchaseId { get; set; }
    public Purchase? Purchase { get; set; }

    public string ChargeType { get; set; } = string.Empty;   // Douane, Fret, TransportLocal, Chargement, Autres
    public string Description { get; set; } = string.Empty;
    public decimal AmountXof { get; set; }
    public DateOnly ChargeDate { get; set; }
    public string? Reference { get; set; }

    // Accounting: which accounts to debit/credit
    public string DebitAccountCode { get; set; } = string.Empty;   // e.g. "6142"
    public string CreditAccountCode { get; set; } = string.Empty;  // e.g. "521"

    public long? JournalEntryId { get; set; }
    public JournalEntry? JournalEntry { get; set; }

    public string? Notes { get; set; }
}
