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
    Task<SupplierOrderDto> ValidateProformaAsync(long id, CancellationToken ct = default);
    Task<SupplierOrderDto> RejectProformaAsync(long id, RejectProformaDto dto, CancellationToken ct = default);
    Task<SupplierOrderDto> ReceiveInvoiceAsync(long id, ReceiveSupplierInvoiceDto dto, CancellationToken ct = default);
    Task<SupplierInvoiceDto> RegisterPaymentAsync(long invoiceId, RegisterSupplierPaymentDto dto, Stream? attachmentStream, string? attachmentFileName, CancellationToken ct = default);
    Task<SupplierOrderDto> ReceiveGoodsAsync(long id, ReceiveGoodsDto dto, CancellationToken ct = default);
    Task<SupplierOrderDto> CloseReceptionAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyList<PurchaseSummaryDto>> GetReceptionsAsync(long orderId, CancellationToken ct = default);
    Task<PurchaseChargeDto> AddPurchaseChargeAsync(long purchaseId, AddPurchaseChargeDto dto, CancellationToken ct = default);
    Task<IReadOnlyList<PurchaseChargeDto>> GetPurchaseChargesAsync(long purchaseId, CancellationToken ct = default);
    Task<SupplierOrderDocumentDto> UploadDocumentAsync(long orderId, Stream content, string originalFileName, long fileSize, string documentType, CancellationToken ct = default);
    Task<IReadOnlyList<SupplierOrderDocumentDto>> GetDocumentsAsync(long orderId, CancellationToken ct = default);
    Task DeleteDocumentAsync(long documentId, CancellationToken ct = default);
    Task SendOrderByEmailAsync(long orderId, string? recipientEmail, CancellationToken ct = default);

    Task<PagedResult<SupplierInvoiceDto>> GetAllInvoicesAsync(int page, int size, string? status, long? supplierId = null, CancellationToken ct = default);
    Task<SupplierInvoiceDto?> GetInvoiceByIdAsync(long invoiceId, CancellationToken ct = default);
}
