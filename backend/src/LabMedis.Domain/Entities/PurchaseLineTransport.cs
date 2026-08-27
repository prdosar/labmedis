using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class PurchaseLineTransport : BaseEntity
{
    public long PurchaseLineId { get; internal set; }
    public PurchaseLine? PurchaseLine { get; internal set; }

    public long TransportTypeId { get; internal set; }
    public TransportType? TransportType { get; internal set; }

    public int Quantity { get; private set; }

    internal void SetQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("La quantité transportée doit être strictement positive.");
        Quantity = quantity;
    }
}
