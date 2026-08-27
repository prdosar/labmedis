using LabMedis.Application.Dtos.Invoices;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default);
    Task<InvoiceDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<InvoiceDto> CreateAsync(InvoiceCreateDto dto, CancellationToken cancellationToken = default);
    Task<InvoiceDto?> UpdateAsync(long id, InvoiceUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default);

    Task<InvoiceLineDto> AddLineAsync(long invoiceId, InvoiceLineCreateDto dto, CancellationToken cancellationToken = default);
    Task<InvoiceLineDto?> UpdateLineAsync(long invoiceId, long lineId, InvoiceLineUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> RemoveLineAsync(long invoiceId, long lineId, CancellationToken cancellationToken = default);

    Task<InvoiceDto?> IssueAsync(long id, CancellationToken cancellationToken = default);
    Task<InvoiceDto?> RegisterPaymentAsync(long id, RegisterPaymentDto dto, CancellationToken cancellationToken = default);
    Task<InvoiceDto?> CancelAsync(long id, CancellationToken cancellationToken = default);
}
