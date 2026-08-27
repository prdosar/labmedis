using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class JournalEntry : BaseEntity
{
    private List<JournalLine> _lines = new();

    /// <summary>Journal code: JV, JA, JT, JOD.</summary>
    public string JournalCode { get; set; } = string.Empty;

    public DateTime EntryDate { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Source event type: InvoiceIssued, InvoicePayment, InvoiceCancelled, PurchaseArrival, SupplierPayment, StockLoss, Manual.</summary>
    public string SourceType { get; set; } = string.Empty;

    public long? SourceId { get; set; }
    public bool IsPosted { get; set; }

    /// <summary>Optional pièce justificative — filename only.</summary>
    public string? AttachmentFileName { get; set; }

    /// <summary>Optional pièce justificative — stored path.</summary>
    public string? AttachmentPath { get; set; }

    public IReadOnlyCollection<JournalLine> Lines => _lines;

    /// <summary>
    /// Validates double-entry balance: sum(Debit) must equal sum(Credit) within a 0.01 tolerance.
    /// </summary>
    public void Validate()
    {
        var totalDebit = _lines.Sum(l => l.DebitAmount);
        var totalCredit = _lines.Sum(l => l.CreditAmount);

        if (Math.Abs(totalDebit - totalCredit) > 0.01m)
            throw new DomainException(
                $"L'écriture comptable n'est pas équilibrée : débit={totalDebit:0.##}, crédit={totalCredit:0.##}.");
    }

    public void AddLine(JournalLine line)
    {
        _lines.Add(line);
    }
}
