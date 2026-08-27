namespace LabMedis.Application.Dtos.Deliveries;

public record DeliveryLineCreateDto(
    long InvoiceLineId,
    long PurchaseLineId,
    int QuantityDelivered);
