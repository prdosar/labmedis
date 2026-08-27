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

    public int Quantity { get; internal set; }
    public int QuantityRemaining { get; private set; }

    public decimal UnitPurchasePrice { get; internal set; }
    public decimal UnitPurchasePriceXof { get; private set; }
    public decimal UnitCostPriceXof { get; private set; }

    public decimal TargetSellingPriceHt { get; set; }

    public IReadOnlyCollection<PurchaseLineTransport> Transports => _transports;
    public IReadOnlyCollection<StockMovement> StockMovements => _stockMovements;
    public IReadOnlyCollection<DeliveryLine> DeliveryLines => _deliveryLines;

    internal void InitializeForPurchase(
        Purchase purchase,
        Product product,
        string lotNumber,
        int quantity,
        decimal unitPurchasePrice,
        DateTime? expirationDate,
        decimal targetSellingPriceHt)
    {
        Purchase = purchase;
        Product = product;
        ProductId = product.Id;
        LotNumber = lotNumber;
        Quantity = quantity;
        QuantityRemaining = quantity;
        UnitPurchasePrice = unitPurchasePrice;
        ExpirationDate = expirationDate;
        TargetSellingPriceHt = targetSellingPriceHt;
        UnitPurchasePriceXof = unitPurchasePrice * purchase.ExchangeRateToXof;
        UnitCostPriceXof = purchase.ComputeUnitCostPriceXof(unitPurchasePrice);
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

    internal void RecalculateFromParent(Purchase purchase)
    {
        if (purchase is null || purchase.Id != PurchaseId)
            throw new DomainException("Recalcul demandé avec un arrivage étranger à cette ligne.");
        UnitPurchasePriceXof = UnitPurchasePrice * purchase.ExchangeRateToXof;
        UnitCostPriceXof = purchase.ComputeUnitCostPriceXof(UnitPurchasePrice);
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
        if (QuantityRemaining + quantity > Quantity)
            throw new DomainException("La réintégration dépasserait la quantité initiale du lot.");
        QuantityRemaining += quantity;
    }
}
