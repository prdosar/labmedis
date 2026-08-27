using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseCreateDto(
    string Reference,
    DateTime PurchaseDate,
    DateTime? ArrivalDate,
    long SupplierId,
    Currency PurchaseCurrency,
    decimal ExchangeRateToXof,
    decimal CommissionCoefficient,
    decimal FreightCoefficient,
    decimal TransitCoefficient,
    decimal TransferFeesCoefficient,
    decimal DefaultMarginCoefficient,
    string? ContainerReference,
    string? Notes);
