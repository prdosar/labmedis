namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderLineDto(
    long Id,
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    string? PackagingName,
    string? DosageName,
    int Quantity,
    string OrderUnit,
    int? UnitsPerCarton,
    int? PackagingUnitsPerPackaging,
    decimal? UnitFobPrice);
