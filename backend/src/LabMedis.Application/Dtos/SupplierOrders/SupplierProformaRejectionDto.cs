namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierProformaRejectionDto(
    long Id,
    string ProformaReference,
    DateTime RejectedAt,
    string Reason
);
