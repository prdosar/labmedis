namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderDocumentDto(
    long Id,
    string DocumentType,
    string FileName,
    string FileUrl,
    long FileSize,
    DateTime UploadedAt);
