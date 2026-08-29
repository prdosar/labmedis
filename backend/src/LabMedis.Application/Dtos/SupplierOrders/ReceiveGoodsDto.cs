namespace LabMedis.Application.Dtos.SupplierOrders;

public record ReceiveGoodsDto(
    DateOnly ArrivalDate,
    string TransportMode,           // Maritime | Aérien | Terrestre
    decimal ExchangeRateToXof,
    string? Notes,
    // Coefficient charges (applied proportionally by FOB to compute PR)
    decimal CommissionRate,         // e.g. 0.25 = 25%
    decimal FreightRate,            // e.g. 0.03 = 3%
    decimal TransitRate,            // e.g. 0.09 = 9%
    decimal TransferRate,           // e.g. 0.07 = 7%
    IList<ReceiveGoodsLineDto> Lines
);

public record ReceiveGoodsLineDto(
    long OrderLineId,
    string LotNumber,
    int QuantityCartons,
    int QuantityLostCartons,
    int UnitsPerCarton,
    decimal UnitFobPricePerCarton,
    DateTime? ExpirationDate,
    decimal MarginRate,             // e.g. 0.10 = 10%
    decimal? FixedSellingPriceHt    // null = use calculated price
);
