namespace LabMedis.Application.Dtos.SupplierOrders;

public record SupplierOrderDocumentDto(
    long Id,
    string DocumentType,
    string FileName,
    string FileUrl,
    long FileSize,
    DateTime UploadedAt);
