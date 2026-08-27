namespace LabMedis.Application.Dtos.Deliveries;

public record DeliveryLineDto(
    long Id,
    long DeliveryId,
    long InvoiceLineId,
    long PurchaseLineId,
    string? LotNumber,
    long? ProductId,
    string? ProductDesignation,
    int QuantityDelivered);
