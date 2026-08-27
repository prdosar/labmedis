namespace LabMedis.Application.Dtos.SupplierOrders;

public record ReceiveProformaDto(
    string? ProformaReference,
    string? ContainerReference,
    decimal? FreightAmount,
    string? PaymentTerms,
    string? Brand,
    string? Origin,
    DateOnly? ExpectedShippingDate,
    IReadOnlyList<ProformaLineInputDto> Lines);

public record ProformaLineInputDto(long LineId, decimal? UnitFobPrice);
