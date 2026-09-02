using LabMedis.Application.Dtos.CustomerCreditNotes;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface ICustomerCreditNoteService
{
    Task<PagedResult<CustomerCreditNoteDto>> GetAllAsync(int page, int size, string? status, long? customerId, CancellationToken ct = default);
    Task<CustomerCreditNoteDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyList<CustomerCreditNoteDto>> GetByInvoiceAsync(long invoiceId, CancellationToken ct = default);
    Task<CustomerCreditNoteDto> CreateAsync(CreateCustomerCreditNoteDto dto, CancellationToken ct = default);
    Task<CustomerCreditNoteDto> UpdateStatusAsync(long id, UpdateCustomerCreditNoteStatusDto dto, CancellationToken ct = default);
    Task<CustomerCreditNoteDto> ApplyToInvoiceAsync(long id, CancellationToken ct = default);
}
