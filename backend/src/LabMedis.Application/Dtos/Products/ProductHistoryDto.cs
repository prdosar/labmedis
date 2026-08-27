namespace LabMedis.Application.Dtos.Products;

public record ProductLotDto(
    long PurchaseLineId,
    string PurchaseReference,
    DateTime PurchaseDate,
    string? SupplierName,
    string LotNumber,
    DateTime? ExpirationDate,
    int QuantityOrdered,
    int QuantityRemaining,
    decimal UnitPurchasePriceXof,
    decimal UnitCostPriceXof,
    decimal TargetSellingPriceHt
);

public record ProductInvoiceLineDto(
    long InvoiceId,
    string InvoiceReference,
    DateTime InvoiceDate,
    string? CustomerName,
    string InvoiceStatus,
    int Quantity,
    decimal UnitPriceHt,
    decimal DiscountPercent,
    decimal TotalHt,
    decimal TotalTtc
);

public record ProductStockMovementDto(
    long Id,
    DateTime MovementDate,
    string MovementType,
    int Quantity,
    string? LotNumber,
    string? WarehouseName,
    string? Reference,
    string? Notes
);

public record ProductHistoryDto(
    ProductDto Product,
    int PendingDeliveryToClients,
    int PendingFromSuppliers,
    IReadOnlyList<ProductLotDto> PurchaseLines,
    IReadOnlyList<ProductInvoiceLineDto> InvoiceLines,
    IReadOnlyList<ProductStockMovementDto> StockMovements
);
