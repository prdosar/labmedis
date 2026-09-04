namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderLotLineDto(
    long Id,
    long CustomerOrderLineId,
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    long PurchaseLineId,
    string LotNumber,
    DateOnly? ExpirationDate,
    int QuantityAllocated,
    long WarehouseId,
    string? WarehouseName);

public record CustomerOrderSuggestedLotDto(
    long OrderLineId,
    long ProductId,
    string ProductCode,
    string ProductDesignation,
    int LineQuantity,
    IReadOnlyList<SuggestedLotItemDto> Lots);

public record SuggestedLotItemDto(
    long PurchaseLineId,
    string LotNumber,
    DateOnly? ExpirationDate,
    int AvailableStock,
    int SuggestedQuantity);

public record PrepareOrderDto(
    IReadOnlyList<PrepareLotInputDto> Lots,
    DateTime? PreparationDate = null);

public record PrepareLotInputDto(long OrderLineId, long PurchaseLineId, int QuantityAllocated);

public record CompleteOrderDto(DateTime? DeliveryDate = null);
