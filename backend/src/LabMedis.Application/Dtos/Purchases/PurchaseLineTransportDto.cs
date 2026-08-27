namespace LabMedis.Application.Dtos.Purchases;

public record PurchaseLineTransportDto(
    long Id,
    long TransportTypeId,
    string? TransportTypeCode,
    string? TransportTypeName,
    int Quantity);
