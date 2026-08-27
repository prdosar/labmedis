using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Product : BaseEntity
{
    private readonly List<PurchaseLine> _purchaseLines = new();
    private readonly List<StockMovement> _stockMovements = new();

    public string Code { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public string? CipCode { get; set; }
    public string? ActiveIngredient { get; set; }

    public long WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public long CategoryId { get; set; }
    public Category? Category { get; set; }

    public long TherapeuticClassId { get; set; }
    public TherapeuticClass? TherapeuticClass { get; set; }

    public long? ProductFormId { get; set; }
    public ProductForm? ProductForm { get; set; }

    public long? DosageId { get; set; }
    public Dosage? Dosage { get; set; }

    public long? PackagingId { get; set; }
    public Packaging? Packaging { get; set; }

    public long? OriginCountryId { get; set; }
    public Country? OriginCountry { get; set; }

    public long? CustomsRegimeId { get; set; }
    public CustomsRegime? CustomsRegime { get; set; }

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public IReadOnlyCollection<PurchaseLine> PurchaseLines => _purchaseLines;
    public IReadOnlyCollection<StockMovement> StockMovements => _stockMovements;
}
