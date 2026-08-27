using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class Purchase : BaseEntity
{
    private readonly List<PurchaseLine> _lines = new();

    public string Reference { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public DateTime? ArrivalDate { get; set; }

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Currency PurchaseCurrency { get; set; } = Currency.EUR;

    public decimal ExchangeRateToXof { get; private set; } = 655.957m;

    public decimal CommissionCoefficient { get; private set; } = 1m;
    public decimal FreightCoefficient { get; private set; } = 1m;
    public decimal TransitCoefficient { get; private set; } = 1m;
    public decimal TransferFeesCoefficient { get; private set; } = 1m;
    public decimal DefaultMarginCoefficient { get; private set; } = 1.10m;

    public string? ContainerReference { get; set; }
    public string? Notes { get; set; }

    public IReadOnlyCollection<PurchaseLine> Lines => _lines;

    public void SetExchangeRate(decimal rate)
    {
        if (rate <= 0)
            throw new DomainException("Le taux de change doit être strictement positif.");
        ExchangeRateToXof = rate;
        foreach (var line in _lines)
            line.RecalculateFromParent(this);
    }

    public void SetCoefficients(
        decimal commission,
        decimal freight,
        decimal transit,
        decimal transferFees,
        decimal defaultMargin)
    {
        EnsurePositive(commission, nameof(commission));
        EnsurePositive(freight, nameof(freight));
        EnsurePositive(transit, nameof(transit));
        EnsurePositive(transferFees, nameof(transferFees));
        EnsurePositive(defaultMargin, nameof(defaultMargin));

        CommissionCoefficient = commission;
        FreightCoefficient = freight;
        TransitCoefficient = transit;
        TransferFeesCoefficient = transferFees;
        DefaultMarginCoefficient = defaultMargin;

        foreach (var line in _lines)
            line.RecalculateFromParent(this);
    }

    public PurchaseLine AddLine(
        Product product,
        string lotNumber,
        int quantity,
        decimal unitPurchasePrice,
        DateTime? expirationDate = null,
        decimal targetSellingPriceHt = 0m)
    {
        if (product is null)
            throw new DomainException("Le produit est obligatoire pour ajouter une ligne d'arrivage.");

        var normalizedLot = (lotNumber ?? string.Empty).Trim();
        if (normalizedLot.Length == 0)
            throw new DomainException("Le numéro de lot est obligatoire à la saisie d'un arrivage.");
        if (quantity <= 0)
            throw new DomainException("La quantité d'un lot doit être strictement positive.");
        if (unitPurchasePrice < 0)
            throw new DomainException("Le prix d'achat unitaire ne peut pas être négatif.");
        if (targetSellingPriceHt < 0)
            throw new DomainException("Le prix de vente cible ne peut pas être négatif.");

        if (_lines.Any(l => l.ProductId == product.Id
                            && string.Equals(l.LotNumber, normalizedLot, StringComparison.OrdinalIgnoreCase)))
            throw new DomainException($"Le lot '{normalizedLot}' existe déjà pour ce produit dans cet arrivage.");

        var line = new PurchaseLine();
        line.InitializeForPurchase(this, product, normalizedLot, quantity, unitPurchasePrice, expirationDate, targetSellingPriceHt);
        _lines.Add(line);
        return line;
    }

    /// <summary>PA (devise arrivage) → XOF × commission × freight × transit × frais transfert.</summary>
    public decimal ComputeUnitCostPriceXof(decimal unitPurchasePriceInPurchaseCurrency)
    {
        if (unitPurchasePriceInPurchaseCurrency < 0)
            throw new DomainException("Le prix d'achat ne peut pas être négatif.");

        var xofBase = unitPurchasePriceInPurchaseCurrency * ExchangeRateToXof;
        return xofBase
            * CommissionCoefficient
            * FreightCoefficient
            * TransitCoefficient
            * TransferFeesCoefficient;
    }

    private static void EnsurePositive(decimal value, string label)
    {
        if (value <= 0)
            throw new DomainException($"Le coefficient '{label}' doit être strictement positif.");
    }
}
