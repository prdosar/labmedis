using LabMedis.Application.Dtos.SupplierOrders;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ISupplierOrderService
{
    Task<PagedResult<SupplierOrderSummaryDto>> GetAllAsync(int page, int size, string? status, long? supplierId, CancellationToken ct = default);
    Task<SupplierOrderDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<SupplierOrderDto> CreateAsync(SupplierOrderCreateDto dto, CancellationToken ct = default);
    Task<SupplierOrderDto?> UpdateAsync(long id, SupplierOrderUpdateDto dto, CancellationToken ct = default);
    Task<SupplierOrderDto> MarkSentAsync(long id, CancellationToken ct = default);
    Task<SupplierOrderDto> CancelAsync(long id, CancellationToken ct = default);
    Task<SupplierOrderDto> ReceiveProformaAsync(long id, ReceiveProformaDto dto, CancellationToken ct = default);
    Task<SupplierOrderDocumentDto> UploadDocumentAsync(long orderId, Stream content, string originalFileName, long fileSize, string documentType, CancellationToken ct = default);
    Task<IReadOnlyList<SupplierOrderDocumentDto>> GetDocumentsAsync(long orderId, CancellationToken ct = default);
    Task DeleteDocumentAsync(long documentId, CancellationToken ct = default);
}
