using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class InvoiceLine : BaseEntity
{
    private readonly List<DeliveryLine> _deliveryLines = new();

    public long InvoiceId { get; internal set; }
    public Invoice? Invoice { get; internal set; }

    public long ProductId { get; internal set; }
    public Product? Product { get; internal set; }

    public int Quantity { get; private set; }
    public decimal UnitPriceHt { get; private set; }
    public decimal DiscountPercent { get; private set; }
    public decimal TvaRate { get; private set; }

    public decimal LineTotalHt { get; private set; }
    public decimal LineTva { get; private set; }
    public decimal LineTotalTtc { get; private set; }

    public IReadOnlyCollection<DeliveryLine> DeliveryLines => _deliveryLines;

    public int QuantityDelivered => _deliveryLines.Sum(d => d.QuantityDelivered);
    public int QuantityRemainingToDeliver => Quantity - QuantityDelivered;

    internal void InitializeAmounts(int quantity, decimal unitPriceHt, decimal discountPercent, decimal tvaRate)
    {
        ValidateQuantity(quantity);
        ValidatePrice(unitPriceHt);
        ValidateDiscount(discountPercent);
        ValidateTvaRate(tvaRate);

        Quantity = quantity;
        UnitPriceHt = unitPriceHt;
        DiscountPercent = discountPercent;
        TvaRate = tvaRate;
        RecomputeAmounts();
    }

    public void ChangeQuantity(int newQuantity)
    {
        ValidateQuantity(newQuantity);
        if (newQuantity < QuantityDelivered)
            throw new DomainException(
                $"La quantité facturée ne peut pas être inférieure à la quantité déjà livrée ({QuantityDelivered}).");
        Quantity = newQuantity;
        RecomputeAmounts();
        Invoice?.RecomputeTotals();
    }

    public void ChangeUnitPrice(decimal unitPriceHt)
    {
        ValidatePrice(unitPriceHt);
        UnitPriceHt = unitPriceHt;
        RecomputeAmounts();
        Invoice?.RecomputeTotals();
    }

    public void ChangeDiscount(decimal discountPercent)
    {
        ValidateDiscount(discountPercent);
        DiscountPercent = discountPercent;
        RecomputeAmounts();
        Invoice?.RecomputeTotals();
    }

    public void ChangeTvaRate(decimal tvaRate)
    {
        ValidateTvaRate(tvaRate);
        TvaRate = tvaRate;
        RecomputeAmounts();
        Invoice?.RecomputeTotals();
    }

    internal void RegisterDelivery(DeliveryLine deliveryLine) => _deliveryLines.Add(deliveryLine);
    internal void UnregisterDelivery(DeliveryLine deliveryLine) => _deliveryLines.Remove(deliveryLine);

    private void RecomputeAmounts()
    {
        var grossHt = Quantity * UnitPriceHt;
        var discount = grossHt * (DiscountPercent / 100m);
        LineTotalHt = grossHt - discount;
        LineTva = LineTotalHt * TvaRate;
        LineTotalTtc = LineTotalHt + LineTva;
    }

    private static void ValidateQuantity(int qty)
    {
        if (qty <= 0)
            throw new DomainException("La quantité facturée doit être strictement positive.");
    }

    private static void ValidatePrice(decimal price)
    {
        if (price < 0)
            throw new DomainException("Le prix unitaire HT ne peut pas être négatif.");
    }

    private static void ValidateDiscount(decimal discount)
    {
        if (discount < 0 || discount >= 100)
            throw new DomainException("La remise doit être comprise dans [0 ; 100[.");
    }

    private static void ValidateTvaRate(decimal rate)
    {
        if (rate < 0 || rate > 1)
            throw new DomainException("Le taux de TVA doit être exprimé en fraction (ex. 0.18) et compris dans [0 ; 1].");
    }
}
