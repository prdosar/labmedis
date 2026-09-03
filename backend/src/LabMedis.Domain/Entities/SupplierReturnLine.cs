using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class SupplierReturnLine : BaseEntity
{
    public long SupplierReturnId { get; set; }
    public SupplierReturn? SupplierReturn { get; set; }

    public long ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>Lot d'origine du produit retourné — null si lot non identifié.</summary>
    public long? PurchaseLineId { get; set; }
    public PurchaseLine? PurchaseLine { get; set; }

    public long WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public int QuantityReturned { get; set; }
    public string? LotNumber { get; set; }

    public decimal UnitCostForeign { get; set; }
    public decimal UnitCostXof { get; set; }

    public decimal LineTotalForeign { get; private set; }
    public decimal LineTotalXof { get; private set; }

    /// <summary>Mouvement de stock de sortie créé lors de la validation du retour.</summary>
    public long? StockMovementId { get; set; }
    public StockMovement? StockMovement { get; set; }

    public void ComputeAmounts()
    {
        LineTotalForeign = Math.Round(UnitCostForeign * QuantityReturned, 4);
        LineTotalXof = Math.Round(UnitCostXof * QuantityReturned, 2);
    }
}
