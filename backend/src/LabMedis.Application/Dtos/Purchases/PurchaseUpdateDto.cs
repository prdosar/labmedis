using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseUpdateDto(
    string Reference,
    DateTime PurchaseDate,
    DateTime? ArrivalDate,
    string TransportMode,
    Currency PurchaseCurrency,
    decimal ExchangeRateToXof,
    string? ContainerReference,
    string? Notes);
