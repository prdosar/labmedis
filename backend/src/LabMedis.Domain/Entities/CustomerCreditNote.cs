using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

/// <summary>
/// Facture avoir client — émise lors d'un retour produit client.
/// Peut être imputée sur la facture d'origine (réduction du solde) ou rembourser directement.
/// </summary>
public class CustomerCreditNote : BaseEntity
{
    private readonly List<CustomerCreditNoteLine> _lines = new();

    public string Reference { get; set; } = string.Empty;

    public long CustomerId { get; set; }
    public Customer? Customer { get; set; }

    /// <summary>Facture client d'origine (null si le retour n'est pas lié à une facture précise).</summary>
    public long? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public DateOnly CreditNoteDate { get; set; }

    public decimal TotalAmountHt { get; private set; }
    public decimal TotalTva { get; private set; }
    public decimal TotalAmountTtc { get; private set; }

    public CustomerCreditNoteStatus Status { get; private set; } = CustomerCreditNoteStatus.EnAttente;

    public string? Notes { get; set; }

    public DateTime? ResolvedAt { get; private set; }

    public IReadOnlyCollection<CustomerCreditNoteLine> Lines => _lines;

    public void AddLine(CustomerCreditNoteLine line)
    {
        _lines.Add(line);
        ComputeTotals();
    }

    public void ComputeTotals()
    {
        TotalAmountHt = _lines.Sum(l => l.LineTotalHt);
        TotalTva = _lines.Sum(l => l.LineTva);
        TotalAmountTtc = _lines.Sum(l => l.LineTotalTtc);
    }

    public void UpdateStatus(CustomerCreditNoteStatus newStatus, string? notes = null)
    {
        Status = newStatus;
        if (notes is not null)
            Notes = notes;
        if (newStatus is CustomerCreditNoteStatus.DéduitDeFacture or CustomerCreditNoteStatus.Remboursé)
            ResolvedAt ??= DateTime.UtcNow;
    }
}
