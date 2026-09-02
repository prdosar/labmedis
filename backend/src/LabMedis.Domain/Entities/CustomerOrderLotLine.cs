using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class CustomerOrderLotLine : BaseEntity
{
    public long CustomerOrderId { get; set; }
    public CustomerOrder? CustomerOrder { get; set; }

    public long CustomerOrderLineId { get; set; }
    public CustomerOrderLine? CustomerOrderLine { get; set; }

    public long ProductId { get; set; }
    public Product? Product { get; set; }

    public long PurchaseLineId { get; set; }
    public PurchaseLine? PurchaseLine { get; set; }

    public long WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public int QuantityAllocated { get; set; }
}
