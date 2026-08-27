using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class Delivery : BaseEntity
{
    private readonly List<DeliveryLine> _lines = new();

    public string Reference { get; set; } = string.Empty;
    public DateTime DeliveryDate { get; set; }

    public long InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public DeliveryStatus Status { get; private set; } = DeliveryStatus.Pending;

    public string? DeliveryAddress { get; set; }
    public string? RecipientName { get; set; }
    public string? CarrierName { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Notes { get; set; }

    public IReadOnlyCollection<DeliveryLine> Lines => _lines;

    public DeliveryLine AddLine(InvoiceLine invoiceLine, PurchaseLine purchaseLine, int quantity)
    {
        EnsureEditable();
        if (invoiceLine is null)
            throw new DomainException("La ligne de facture est obligatoire.");
        if (purchaseLine is null)
            throw new DomainException("Le lot d'origine est obligatoire.");
        if (invoiceLine.InvoiceId != InvoiceId)
            throw new DomainException("Cette ligne de facture n'appartient pas à la facture livrée.");
        if (invoiceLine.ProductId != purchaseLine.ProductId)
            throw new DomainException("Le lot sélectionné ne correspond pas au produit facturé.");
        if (quantity <= 0)
            throw new DomainException("La quantité livrée doit être strictement positive.");
        if (quantity > invoiceLine.QuantityRemainingToDeliver)
            throw new DomainException(
                $"La quantité livrée ({quantity}) dépasse le reste à livrer pour cette ligne ({invoiceLine.QuantityRemainingToDeliver}).");

        purchaseLine.ConsumeStock(quantity);

        var line = new DeliveryLine
        {
            Delivery = this,
            InvoiceLine = invoiceLine,
            InvoiceLineId = invoiceLine.Id,
            PurchaseLine = purchaseLine,
            PurchaseLineId = purchaseLine.Id,
        };
        line.SetQuantity(quantity);
        _lines.Add(line);
        invoiceLine.RegisterDelivery(line);
        return line;
    }

    public void RemoveLine(DeliveryLine line)
    {
        EnsureEditable();
        if (line is null)
            throw new DomainException("La ligne de livraison à supprimer est obligatoire.");
        if (!_lines.Contains(line))
            throw new DomainException("Cette ligne n'appartient pas au bon de livraison.");

        line.PurchaseLine?.ReleaseStock(line.QuantityDelivered);
        line.InvoiceLine?.UnregisterDelivery(line);
        _lines.Remove(line);
    }

    public void Ship()
    {
        if (Status != DeliveryStatus.Pending)
            throw new DomainException("Seul un BL en préparation peut être expédié.");
        if (_lines.Count == 0)
            throw new DomainException("Impossible d'expédier un BL sans ligne.");
        Status = DeliveryStatus.InTransit;
    }

    public void MarkDelivered()
    {
        if (Status != DeliveryStatus.InTransit)
            throw new DomainException("Seul un BL en cours de transit peut être marqué livré.");
        Status = DeliveryStatus.Delivered;
    }

    public void Cancel()
    {
        if (Status == DeliveryStatus.Delivered)
            throw new DomainException("Un BL déjà livré ne peut pas être annulé.");
        if (Status == DeliveryStatus.Cancelled)
            return;

        foreach (var line in _lines)
        {
            line.PurchaseLine?.ReleaseStock(line.QuantityDelivered);
            line.InvoiceLine?.UnregisterDelivery(line);
        }
        _lines.Clear();
        Status = DeliveryStatus.Cancelled;
    }

    private void EnsureEditable()
    {
        if (Status != DeliveryStatus.Pending)
            throw new DomainException("Les lignes ne peuvent être modifiées qu'en préparation du BL.");
    }
}
