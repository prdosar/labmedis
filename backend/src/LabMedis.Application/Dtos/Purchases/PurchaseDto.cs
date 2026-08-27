using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseDto(
    long Id,
    string Reference,
    DateTime PurchaseDate,
    DateTime? ArrivalDate,
    long SupplierId,
    string? SupplierName,
    Currency PurchaseCurrency,
    decimal ExchangeRateToXof,
    decimal CommissionCoefficient,
    decimal FreightCoefficient,
    decimal TransitCoefficient,
    decimal TransferFeesCoefficient,
    decimal DefaultMarginCoefficient,
    string? ContainerReference,
    string? Notes,
    IReadOnlyList<PurchaseLineDto> Lines,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
