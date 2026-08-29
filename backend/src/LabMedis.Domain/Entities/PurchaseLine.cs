using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class PurchaseLine : BaseEntity
{
    private readonly List<PurchaseLineTransport> _transports = new();
    private readonly List<StockMovement> _stockMovements = new();
    private readonly List<DeliveryLine> _deliveryLines = new();

    public long PurchaseId { get; internal set; }
    public Purchase? Purchase { get; internal set; }

    public long ProductId { get; internal set; }
    public Product? Product { get; internal set; }

    public string LotNumber { get; set; } = string.Empty;
    public DateTime? ExpirationDate { get; set; }

    /// <summary>Total cartons received (including damaged ones — they were paid for).</summary>
    public int Quantity { get; internal set; }

    /// <summary>Cartons damaged/lost during transport.</summary>
    public int QuantityLostCartons { get; internal set; }

    /// <summary>Number of sellable units per carton.</summary>
    public int UnitsPerCarton { get; internal set; } = 1;

    /// <summary>Good units that physically enter the warehouse stock.</summary>
    public int GoodUnitsReceived => (Quantity - QuantityLostCartons) * UnitsPerCarton;

    /// <summary>Good units still available in stock (decreases as sales are made).</summary>
    public int QuantityRemaining { get; private set; }

    /// <summary>FOB price per carton in purchase currency (EUR, USD, etc.).</summary>
    public decimal UnitPurchasePrice { get; internal set; }

    /// <summary>FOB price per carton converted to XOF.</summary>
    public decimal UnitPurchasePriceXof { get; private set; }

    /// <summary>True landed cost per sellable unit in XOF (FOB + proportional charges) / good units.</summary>
    public decimal UnitCostPriceXof { get; private set; }

    public decimal TargetSellingPriceHt { get; set; }

    /// <summary>Margin rate applied on top of PR to compute PV HT (e.g. 0.10 = 10%).</summary>
    public decimal MarginRate { get; private set; } = 0.10m;

    /// <summary>PV HT computed from formula: UnitCostPriceXof × (1 + MarginRate).</summary>
    public decimal CalculatedSellingPriceHt { get; private set; }

    public IReadOnlyCollection<PurchaseLineTransport> Transports => _transports;
    public IReadOnlyCollection<StockMovement> StockMovements => _stockMovements;
    public IReadOnlyCollection<DeliveryLine> DeliveryLines => _deliveryLines;

    internal void InitializeForPurchase(
        Purchase purchase,
        Product product,
        string lotNumber,
        int quantityCartons,
        int quantityLostCartons,
        int unitsPerCarton,
        decimal unitFobPricePerCarton,
        DateTime? expirationDate,
        decimal marginRate = 0.10m)
    {
        Purchase = purchase;
        Product = product;
        ProductId = product.Id;
        LotNumber = lotNumber;
        Quantity = quantityCartons;
        QuantityLostCartons = quantityLostCartons;
        UnitsPerCarton = unitsPerCarton;
        QuantityRemaining = GoodUnitsReceived;
        UnitPurchasePrice = unitFobPricePerCarton;
        ExpirationDate = expirationDate;
        MarginRate = marginRate >= 0 ? marginRate : 0m;

        UnitPurchasePriceXof = unitFobPricePerCarton * purchase.ExchangeRateToXof;
        // Initial cost = FOB per unit (charges added later via RecalculateCosts)
        UnitCostPriceXof = unitsPerCarton > 0
            ? Math.Round(UnitPurchasePriceXof / unitsPerCarton, 4)
            : UnitPurchasePriceXof;
    }

    internal void SetCostPrice(decimal unitCostXof)
    {
        UnitCostPriceXof = unitCostXof;
        if (MarginRate > 0)
            CalculatedSellingPriceHt = Math.Round(unitCostXof * (1 + MarginRate), 4);
    }

    /// <summary>Sets the final selling price (fixed override or falls back to calculated price).</summary>
    public void SetFinalSellingPrice(decimal? fixedPrice)
    {
        TargetSellingPriceHt = fixedPrice > 0 ? fixedPrice.Value : CalculatedSellingPriceHt;
    }

    /// <summary>Updates margin and/or fixed selling price after reception (e.g. manual price correction).</summary>
    public void UpdatePricing(decimal marginRate, decimal? fixedSellingPriceHt)
    {
        MarginRate = marginRate >= 0 ? marginRate : 0m;
        if (UnitCostPriceXof > 0)
            CalculatedSellingPriceHt = Math.Round(UnitCostPriceXof * (1 + MarginRate), 4);
        SetFinalSellingPrice(fixedSellingPriceHt);
    }

    internal void RecalculateFromParent(Purchase purchase)
    {
        if (purchase is null || purchase.Id != PurchaseId)
            throw new DomainException("Recalcul demandé avec un arrivage étranger à cette ligne.");
        UnitPurchasePriceXof = UnitPurchasePrice * purchase.ExchangeRateToXof;
        UnitCostPriceXof = UnitsPerCarton > 0
            ? Math.Round(UnitPurchasePriceXof / UnitsPerCarton, 4)
            : UnitPurchasePriceXof;
    }

    public void ConsumeStock(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("La quantité à sortir du stock doit être strictement positive.");
        if (quantity > QuantityRemaining)
            throw new DomainException(
                $"Stock insuffisant sur le lot '{LotNumber}' : {QuantityRemaining} disponible(s), {quantity} demandé(s).");
        QuantityRemaining -= quantity;
    }

    public void ReleaseStock(int quantity)
    {
        if (quantity <= 0)
            throw new DomainException("La quantité à réintégrer doit être strictement positive.");
        if (QuantityRemaining + quantity > GoodUnitsReceived)
            throw new DomainException("La réintégration dépasserait la quantité initiale du lot.");
        QuantityRemaining += quantity;
    }

    public PurchaseLineTransport AddTransport(TransportType transportType, int quantity)
    {
        if (transportType is null)
            throw new DomainException("Le mode de transport est obligatoire.");
        if (quantity <= 0)
            throw new DomainException("La quantité transportée doit être strictement positive.");
        if (_transports.Any(t => t.TransportTypeId == transportType.Id))
            throw new DomainException("Ce mode de transport est déjà utilisé pour ce lot.");

        var allocated = _transports.Sum(t => t.Quantity);
        if (allocated + quantity > Quantity)
            throw new DomainException(
                $"La somme des quantités transportées ({allocated + quantity}) dépasse la quantité du lot ({Quantity}).");

        var transport = new PurchaseLineTransport
        {
            PurchaseLine = this,
            TransportType = transportType,
            TransportTypeId = transportType.Id,
        };
        transport.SetQuantity(quantity);
        _transports.Add(transport);
        return transport;
    }

    public void ChangeTransportQuantity(long transportTypeId, int newQuantity)
    {
        var transport = _transports.FirstOrDefault(t => t.TransportTypeId == transportTypeId)
            ?? throw new DomainException("Ce mode de transport n'est pas déclaré sur ce lot.");
        if (newQuantity <= 0)
            throw new DomainException("La quantité transportée doit être strictement positive.");
        var others = _transports.Where(t => t.TransportTypeId != transportTypeId).Sum(t => t.Quantity);
        if (others + newQuantity > Quantity)
            throw new DomainException(
                $"La somme des quantités transportées ({others + newQuantity}) dépasse la quantité du lot ({Quantity}).");
        transport.SetQuantity(newQuantity);
    }

    public void RemoveTransport(long transportTypeId)
    {
        var transport = _transports.FirstOrDefault(t => t.TransportTypeId == transportTypeId)
            ?? throw new DomainException("Ce mode de transport n'est pas déclaré sur ce lot.");
        _transports.Remove(transport);
    }
}
