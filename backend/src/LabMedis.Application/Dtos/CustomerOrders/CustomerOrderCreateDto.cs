namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderCreateDto(
    long CustomerId,
    DateOnly OrderDate,
    bool VatApplied,
    string Currency,
    string? Notes,
    IReadOnlyList<CustomerOrderLineInputDto> Lines);
