namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderUpdateDto(
    DateOnly OrderDate,
    bool VatApplied,
    string Currency,
    string? Notes,
    IReadOnlyList<CustomerOrderLineInputDto> Lines);
