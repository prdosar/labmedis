namespace LabMedis.Application.Dtos.Deliveries;

public record DeliveryDto(
    long Id,
    string Reference,
    DateTime DeliveryDate,
    long InvoiceId,
    string? InvoiceReference,
    string Status,
    string? DeliveryAddress,
    string? RecipientName,
    string? CarrierName,
    string? TrackingNumber,
    string? Notes,
    IReadOnlyList<DeliveryLineDto> Lines,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
