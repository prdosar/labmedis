using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class StockMovement : BaseEntity
{
    public long ProductId { get; set; }
    public Product? Product { get; set; }

    public long WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public long? PurchaseLineId { get; set; }
    public PurchaseLine? PurchaseLine { get; set; }

    public StockMovementType MovementType { get; set; }
    public int Quantity { get; set; }
    public DateTime MovementDate { get; set; }

    public string? Reference { get; set; }
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}
