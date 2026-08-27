namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderCreateDto(
    long SupplierId,
    DateOnly OrderDate,
    string Currency,
    string? Notes,
    IReadOnlyList<SupplierOrderLineInputDto> Lines);
