namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderPreviewRequestDto(
    bool VatApplied,
    IReadOnlyList<CustomerOrderLineInputDto> Lines);
