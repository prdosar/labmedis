using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class CustomerCreditNoteLine : BaseEntity
{
    public long CustomerCreditNoteId { get; set; }
    public CustomerCreditNote? CreditNote { get; set; }

    public long ProductId { get; set; }
    public Product? Product { get; set; }

    public long WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    /// <summary>Ligne d'arrivage (lot) renvoyée — null si le lot n'est pas connu.</summary>
    public long? PurchaseLineId { get; set; }
    public PurchaseLine? PurchaseLine { get; set; }

    public int QuantityReturned { get; set; }
    public decimal UnitPriceHt { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal TvaRate { get; set; }

    public decimal LineTotalHt { get; private set; }
    public decimal LineTva { get; private set; }
    public decimal LineTotalTtc { get; private set; }

    public string? LotNumber { get; set; }

    /// <summary>Mouvement de stock de type Retour généré lors de la création de la ligne.</summary>
    public long? StockMovementId { get; set; }
    public StockMovement? StockMovement { get; set; }

    public void ComputeAmounts()
    {
        var baseHt = Math.Round(UnitPriceHt * QuantityReturned, 4);
        var discountAmt = Math.Round(baseHt * DiscountPercent / 100m, 4);
        LineTotalHt = Math.Round(baseHt - discountAmt, 4);
        LineTva = Math.Round(LineTotalHt * TvaRate / 100m, 4);
        LineTotalTtc = Math.Round(LineTotalHt + LineTva, 4);
    }
}
