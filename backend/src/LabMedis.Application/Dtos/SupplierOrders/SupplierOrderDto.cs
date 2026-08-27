namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderDto(
    long Id,
    string Reference,
    DateTime OrderDate,
    long SupplierId,
    string SupplierName,
    string Status,
    string Currency,
    string? Notes,
    string? ProformaReference,
    string? ProformaFilePath,
    DateTime? ProformaReceivedAt,
    string? ContainerReference,
    decimal? FreightAmount,
    string? PaymentTerms,
    string? Brand,
    string? Origin,
    DateOnly? ExpectedShippingDate,
    IReadOnlyList<SupplierOrderLineDto> Lines,
    IReadOnlyList<SupplierOrderDocumentDto> Documents,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
