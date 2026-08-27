namespace LabMedis.Application.Dtos.Deliveries;

public record DeliveryUpdateDto(
    string Reference,
    DateTime DeliveryDate,
    string? DeliveryAddress,
    string? RecipientName,
    string? CarrierName,
    string? TrackingNumber,
    string? Notes);
