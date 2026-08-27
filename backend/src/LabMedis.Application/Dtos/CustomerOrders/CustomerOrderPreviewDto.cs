namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderPreviewDto(
    IReadOnlyList<CustomerOrderPreviewLineDto> Lines,
    decimal TotalHt,
    decimal TotalTva,
    decimal TotalTtc,
    decimal TotalCost,
    decimal Profit);
