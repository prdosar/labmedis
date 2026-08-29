namespace LabMedis.Application.Dtos.SupplierOrders;

public record PurchaseSummaryDto(
    long Id,
    string Reference,
    DateOnly ArrivalDate,
    string TransportMode,
    long SupplierId,
    string SupplierName,
    string? ContainerReference,
    decimal TotalFobXof,
    decimal TotalChargesXof,
    int TotalGoodUnits,
    int TotalLostCartons,
    int LineCount,
    string? Notes,
    DateTime CreatedAt,
    IReadOnlyList<PurchaseChargeDto> Charges
);
