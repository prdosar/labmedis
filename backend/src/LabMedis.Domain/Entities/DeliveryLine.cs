using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class DeliveryLine : BaseEntity
{
    public long DeliveryId { get; internal set; }
    public Delivery? Delivery { get; internal set; }

    public long InvoiceLineId { get; internal set; }
    public InvoiceLine? InvoiceLine { get; internal set; }

    public long PurchaseLineId { get; internal set; }
    public PurchaseLine? PurchaseLine { get; internal set; }

    public int QuantityDelivered { get; private set; }

    internal void SetQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("La quantité livrée doit être strictement positive.");
        QuantityDelivered = quantity;
    }
}
