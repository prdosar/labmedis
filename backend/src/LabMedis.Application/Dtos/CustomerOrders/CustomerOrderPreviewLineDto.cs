namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderPreviewLineDto(
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    int Quantity,
    int UnitsPerCarton,
    int AvailableStock,
    decimal UnitPriceHt,
    decimal UnitCostPrice,
    decimal LineTotalHt,
    decimal LineTotalTva,
    decimal LineTotalTtc,
    decimal LineTotalCost,
    decimal LineProfit);
