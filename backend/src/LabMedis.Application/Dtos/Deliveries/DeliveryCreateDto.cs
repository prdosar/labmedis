namespace LabMedis.Application.Dtos.Deliveries;

public record DeliveryCreateDto(
    string Reference,
    DateTime DeliveryDate,
    long InvoiceId,
    string? DeliveryAddress,
    string? RecipientName,
    string? CarrierName,
    string? TrackingNumber,
    string? Notes);
