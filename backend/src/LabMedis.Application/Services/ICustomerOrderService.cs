using LabMedis.Application.Dtos.CustomerOrders;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICustomerOrderService
{
    Task<PagedResult<CustomerOrderSummaryDto>> GetAllAsync(int page, int size, string? status, long? customerId, CancellationToken ct = default);
    Task<CustomerOrderDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<CustomerOrderDto> CreateAsync(CustomerOrderCreateDto dto, CancellationToken ct = default);
    Task<CustomerOrderDto?> UpdateAsync(long id, CustomerOrderUpdateDto dto, CancellationToken ct = default);
    Task<CustomerOrderDto> ValidateAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyList<CustomerOrderSuggestedLotDto>> GetSuggestedLotsAsync(long orderId, CancellationToken ct = default);
    Task<CustomerOrderDto> PrepareAsync(long orderId, PrepareOrderDto dto, CancellationToken ct = default);
    Task<CustomerOrderDto> CompleteAsync(long id, CancellationToken ct = default);
    Task<CustomerOrderDto> CancelAsync(long id, CancellationToken ct = default);
    Task<CustomerOrderPreviewDto> PreviewAsync(CustomerOrderPreviewRequestDto dto, CancellationToken ct = default);
    Task<int> GetAvailableStockAsync(long productId, long? excludeOrderId = null, CancellationToken ct = default);
    Task<ProductStockInfoDto> GetStockInfoAsync(long productId, long? excludeOrderId = null, CancellationToken ct = default);
    Task<CustomerStatsDto> GetCustomerStatsAsync(long customerId, CancellationToken ct = default);
    // Documents
    Task<IReadOnlyList<CustomerOrderDocumentDto>> GetDocumentsAsync(long orderId, CancellationToken ct = default);
    Task<CustomerOrderDocumentDto> UploadDocumentAsync(long orderId, Stream content, string fileName, long fileSize, string documentType, CancellationToken ct = default);
    Task DeleteDocumentAsync(long documentId, CancellationToken ct = default);
    // Email
    Task SendEmailAsync(long orderId, string emailType, CancellationToken ct = default);
}
