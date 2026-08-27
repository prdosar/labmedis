namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderUpdateDto(
    DateOnly OrderDate,
    string Currency,
    string? Notes,
    IReadOnlyList<SupplierOrderLineInputDto> Lines);
