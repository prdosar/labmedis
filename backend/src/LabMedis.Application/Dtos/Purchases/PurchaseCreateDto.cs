using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseCreateDto(
    string Reference,
    DateTime PurchaseDate,
    DateTime? ArrivalDate,
    long? SupplierOrderId,
    string TransportMode,
    long SupplierId,
    Currency PurchaseCurrency,
    decimal ExchangeRateToXof,
    string? ContainerReference,
    string? Notes);
