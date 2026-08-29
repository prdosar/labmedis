using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseDto(
    long Id,
    string Reference,
    DateTime PurchaseDate,
    DateTime? ArrivalDate,
    long? SupplierOrderId,
    string TransportMode,
    long SupplierId,
    string? SupplierName,
    Currency PurchaseCurrency,
    decimal ExchangeRateToXof,
    string? ContainerReference,
    string? Notes,
    decimal TotalFobXof,
    decimal TotalChargesXof,
    int TotalGoodUnits,
    int TotalLostCartons,
    IReadOnlyList<PurchaseLineDto> Lines,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
