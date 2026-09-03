using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class SupplierReturn : BaseEntity
{
    private readonly List<SupplierReturnLine> _lines = new();

    public string Reference { get; set; } = string.Empty;

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    /// <summary>Arrivage (lot) concerné par le retour — null si retour non lié à un arrivage précis.</summary>
    public long? PurchaseId { get; set; }
    public Purchase? Purchase { get; set; }

    public DateOnly ReturnDate { get; set; }

    public string Currency { get; set; } = "EUR";
    public decimal ExchangeRateToXof { get; set; } = 655.957m;

    public decimal TotalAmountForeign { get; private set; }
    public decimal TotalAmountXof { get; private set; }

    public string? Reason { get; set; }
    public string? Notes { get; set; }

    public SupplierReturnStatus Status { get; private set; } = SupplierReturnStatus.EnCours;

    /// <summary>Avoir fournisseur généré lors de la création du retour (null si non demandé).</summary>
    public long? SupplierCreditNoteId { get; set; }
    public SupplierCreditNote? SupplierCreditNote { get; set; }

    public IReadOnlyCollection<SupplierReturnLine> Lines => _lines;

    public void AddLine(SupplierReturnLine line)
    {
        _lines.Add(line);
        RecomputeTotals();
    }

    public void RecomputeTotals()
    {
        TotalAmountForeign = _lines.Sum(l => l.LineTotalForeign);
        TotalAmountXof = _lines.Sum(l => l.LineTotalXof);
    }

    public void UpdateStatus(SupplierReturnStatus status)
    {
        Status = status;
    }
}
