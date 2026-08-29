using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class Purchase : BaseEntity
{
    private readonly List<PurchaseLine> _lines = new();
    private readonly List<PurchaseCharge> _charges = new();

    public string Reference { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public DateTime? ArrivalDate { get; set; }

    public long? SupplierOrderId { get; set; }
    public string TransportMode { get; set; } = string.Empty;  // Maritime, Aérien, Terrestre

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Currency PurchaseCurrency { get; set; } = Currency.EUR;
    public decimal ExchangeRateToXof { get; private set; } = 655.957m;

    public string? ContainerReference { get; set; }
    public string? Notes { get; set; }

    public IReadOnlyCollection<PurchaseLine> Lines => _lines;
    public IReadOnlyCollection<PurchaseCharge> Charges => _charges;

    public decimal TotalFobXof => _lines.Sum(l => l.UnitPurchasePriceXof * l.Quantity);
    public decimal TotalChargesXof => _charges.Sum(c => c.AmountXof);
    public int TotalGoodUnits => _lines.Sum(l => l.GoodUnitsReceived);
    public int TotalLostCartons => _lines.Sum(l => l.QuantityLostCartons);

    public void SetExchangeRate(decimal rate)
    {
        if (rate <= 0)
            throw new DomainException("Le taux de change doit être strictement positif.");
        ExchangeRateToXof = rate;
        foreach (var line in _lines)
            line.RecalculateFromParent(this);
        RecalculateCosts();
    }

    public PurchaseLine AddLine(
        Product product,
        string lotNumber,
        int quantityCartons,
        int quantityLostCartons,
        int unitsPerCarton,
        decimal unitFobPricePerCarton,
        DateTime? expirationDate = null,
        decimal marginRate = 0.10m)
    {
        if (product is null)
            throw new DomainException("Le produit est obligatoire pour ajouter une ligne d'arrivage.");

        var normalizedLot = (lotNumber ?? string.Empty).Trim();
        if (normalizedLot.Length == 0)
            throw new DomainException("Le numéro de lot est obligatoire à la saisie d'un arrivage.");
        if (quantityCartons <= 0)
            throw new DomainException("La quantité de cartons doit être strictement positive.");
        if (quantityLostCartons < 0 || quantityLostCartons > quantityCartons)
            throw new DomainException("Le nombre de cartons perdus doit être compris entre 0 et la quantité reçue.");
        if (unitsPerCarton <= 0)
            throw new DomainException("Le nombre d'unités par carton doit être strictement positif.");
        if (unitFobPricePerCarton < 0)
            throw new DomainException("Le prix FOB ne peut pas être négatif.");

        if (_lines.Any(l => l.ProductId == product.Id
                            && string.Equals(l.LotNumber, normalizedLot, StringComparison.OrdinalIgnoreCase)))
            throw new DomainException($"Le lot '{normalizedLot}' existe déjà pour ce produit dans cet arrivage.");

        var line = new PurchaseLine();
        line.InitializeForPurchase(this, product, normalizedLot, quantityCartons, quantityLostCartons,
            unitsPerCarton, unitFobPricePerCarton, expirationDate, marginRate);
        _lines.Add(line);
        return line;
    }

    public void AddCharge(PurchaseCharge charge)
    {
        _charges.Add(charge);
        RecalculateCosts();
    }

    /// <summary>
    /// Distributes total charges proportionally across lines based on FOB value.
    /// Updates UnitCostPriceXof on each line to reflect the true landed cost per unit.
    /// </summary>
    public void RecalculateCosts()
    {
        var totalFobXof = _lines.Sum(l => l.UnitPurchasePriceXof * l.Quantity);
        var totalCharges = _charges.Sum(c => c.AmountXof);

        foreach (var line in _lines)
        {
            if (line.GoodUnitsReceived <= 0)
            {
                line.SetCostPrice(0m);
                continue;
            }

            var lineFobXof = line.UnitPurchasePriceXof * line.Quantity;
            var proportionalCharges = totalFobXof > 0
                ? lineFobXof / totalFobXof * totalCharges
                : (_lines.Count > 0 ? totalCharges / _lines.Count : 0m);

            var totalLineCost = lineFobXof + proportionalCharges;
            line.SetCostPrice(Math.Round(totalLineCost / line.GoodUnitsReceived, 4));
        }
    }
}
