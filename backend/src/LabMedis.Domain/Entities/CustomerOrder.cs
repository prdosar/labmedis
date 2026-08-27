using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class CustomerOrder : BaseEntity
{
    private readonly List<CustomerOrderLine> _lines = new();

    public string Reference { get; private set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public CustomerOrderStatus Status { get; private set; } = CustomerOrderStatus.EnAttente;

    public long CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public bool VatApplied { get; set; }
    public string Currency { get; set; } = "XOF";
    public string? Notes { get; set; }

    public long? InvoiceId { get; private set; }
    public Invoice? Invoice { get; set; }

    public decimal TotalHt { get; set; }
    public decimal TotalTva { get; set; }
    public decimal TotalTtc { get; set; }
    public decimal TotalCost { get; set; }
    public decimal Profit { get; set; }

    public IReadOnlyCollection<CustomerOrderLine> Lines => _lines;

    public void SetReference(string reference) => Reference = reference;

    public void Validate(long invoiceId)
    {
        if (Status != CustomerOrderStatus.EnAttente)
            throw new DomainException("Seule une commande en attente peut être validée.");
        if (_lines.Count == 0)
            throw new DomainException("Impossible de valider une commande sans ligne.");
        InvoiceId = invoiceId;
        Status = CustomerOrderStatus.Validée;
    }

    public void Complete()
    {
        if (Status != CustomerOrderStatus.Validée)
            throw new DomainException("Seule une commande validée peut être clôturée.");
        Status = CustomerOrderStatus.Terminée;
    }

    public void Cancel()
    {
        if (Status == CustomerOrderStatus.Terminée)
            throw new DomainException("Une commande terminée ne peut pas être annulée.");
        if (Status == CustomerOrderStatus.Annulée)
            return;
        Status = CustomerOrderStatus.Annulée;
    }

    internal void RecomputeTotals()
    {
        TotalHt = _lines.Sum(l => l.LineTotalHt);
        TotalTva = _lines.Sum(l => l.LineTotalTva);
        TotalTtc = TotalHt + TotalTva;
        TotalCost = _lines.Sum(l => l.LineTotalCost);
        Profit = TotalHt - TotalCost;
    }
}
