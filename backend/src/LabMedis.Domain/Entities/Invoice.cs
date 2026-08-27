using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class Invoice : BaseEntity
{
    private readonly List<InvoiceLine> _lines = new();
    private readonly List<Delivery> _deliveries = new();

    public string Reference { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }

    public long CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Draft;

    public decimal SubtotalHt { get; private set; }
    public decimal TotalTva { get; private set; }
    public decimal TotalTtc { get; private set; }
    public decimal AmountPaid { get; private set; }

    public string? Notes { get; set; }

    public IReadOnlyCollection<InvoiceLine> Lines => _lines;
    public IReadOnlyCollection<Delivery> Deliveries => _deliveries;

    public decimal BalanceDue => TotalTtc - AmountPaid;

    public InvoiceLine AddLine(Product product, int quantity, decimal unitPriceHt, decimal discountPercent, decimal tvaRate)
    {
        EnsureEditable();
        if (product is null)
            throw new DomainException("Le produit est obligatoire.");

        var line = new InvoiceLine
        {
            Invoice = this,
            Product = product,
            ProductId = product.Id,
        };
        line.InitializeAmounts(quantity, unitPriceHt, discountPercent, tvaRate);
        _lines.Add(line);
        RecomputeTotals();
        return line;
    }

    public void RemoveLine(InvoiceLine line)
    {
        EnsureEditable();
        if (line is null)
            throw new DomainException("La ligne à supprimer est obligatoire.");
        if (line.DeliveryLines.Count > 0)
            throw new DomainException("Impossible de supprimer une ligne déjà associée à une livraison.");
        _lines.Remove(line);
        RecomputeTotals();
    }

    public void Issue()
    {
        if (Status != InvoiceStatus.Draft)
            throw new DomainException("Seule une facture en brouillon peut être émise.");
        if (_lines.Count == 0)
            throw new DomainException("Impossible d'émettre une facture sans ligne.");
        Status = InvoiceStatus.Issued;
    }

    public void RegisterPayment(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("Le montant du règlement doit être strictement positif.");
        if (Status == InvoiceStatus.Draft)
            throw new DomainException("Une facture en brouillon ne peut pas être encaissée.");
        if (Status == InvoiceStatus.Cancelled)
            throw new DomainException("Une facture annulée ne peut pas être encaissée.");
        if (Status == InvoiceStatus.Paid)
            throw new DomainException("Cette facture est déjà entièrement payée.");

        var newAmount = AmountPaid + amount;
        if (newAmount > TotalTtc)
            throw new DomainException($"Le règlement dépasse le solde dû ({BalanceDue:0.####}).");

        AmountPaid = newAmount;
        Status = AmountPaid == TotalTtc ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
    }

    public void Cancel()
    {
        if (Status == InvoiceStatus.Paid)
            throw new DomainException("Une facture entièrement payée ne peut pas être annulée.");
        if (Status == InvoiceStatus.Cancelled)
            return;
        Status = InvoiceStatus.Cancelled;
    }

    internal void RecomputeTotals()
    {
        SubtotalHt = _lines.Sum(l => l.LineTotalHt);
        TotalTva = _lines.Sum(l => l.LineTva);
        TotalTtc = _lines.Sum(l => l.LineTotalTtc);
    }

    private void EnsureEditable()
    {
        if (Status != InvoiceStatus.Draft)
            throw new DomainException("Les lignes ne peuvent être modifiées qu'en statut brouillon.");
    }
}
