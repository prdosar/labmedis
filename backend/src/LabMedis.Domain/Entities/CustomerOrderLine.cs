using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class CustomerOrderLine : BaseEntity
{
    public long CustomerOrderId { get; set; }
    public CustomerOrder? CustomerOrder { get; set; }

    public long ProductId { get; set; }
    public Product? Product { get; set; }

    public int Quantity { get; set; }
    public decimal UnitPriceHt { get; set; }
    public decimal UnitCostPrice { get; set; }

    public decimal LineTotalHt { get; private set; }
    public decimal LineTotalTva { get; private set; }
    public decimal LineTotalTtc { get; private set; }
    public decimal LineTotalCost { get; private set; }

    public void ComputeAmounts(bool vatApplied)
    {
        LineTotalHt = Quantity * UnitPriceHt;
        LineTotalTva = vatApplied ? Math.Round(LineTotalHt * 0.18m, 2) : 0m;
        LineTotalTtc = LineTotalHt + LineTotalTva;
        LineTotalCost = Quantity * UnitCostPrice;
    }
}
