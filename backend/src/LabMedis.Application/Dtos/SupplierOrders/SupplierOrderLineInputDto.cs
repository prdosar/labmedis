namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderLineInputDto(
    long ProductId,
    int Quantity,
    string OrderUnit,
    int? UnitsPerCarton);
