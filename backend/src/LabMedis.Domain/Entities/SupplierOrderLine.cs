using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class SupplierOrderLine : BaseEntity
{
    public long SupplierOrderId { get; set; }
    public SupplierOrder? SupplierOrder { get; set; }

    public long ProductId { get; set; }
    public Product? Product { get; set; }

    public int Quantity { get; set; }
    public string OrderUnit { get; set; } = "Carton"; // "Carton" or "Boite"
    public int? UnitsPerCarton { get; set; } // boites per carton, from packaging
    public decimal? UnitFobPrice { get; set; } // filled after proforma reception
}
