namespace LabMedis.Application.Dtos.SupplierOrders;

public record ReceiveGoodsDto(
    DateOnly ArrivalDate,
    decimal ExchangeRateToXof,
    decimal CommissionCoefficient,
    decimal FreightCoefficient,
    decimal TransitCoefficient,
    decimal TransferFeesCoefficient,
    decimal DefaultMarginCoefficient,
    string? Notes,
    IList<ReceiveGoodsLineDto> Lines
);

public record ReceiveGoodsLineDto(
    long OrderLineId,
    string LotNumber,
    int Quantity,
    decimal UnitFobPrice,
    DateTime? ExpirationDate,
    decimal TargetSellingPriceHt
);
