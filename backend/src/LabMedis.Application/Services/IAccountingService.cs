using LabMedis.Application.Dtos.Accounting;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;

namespace LabMedis.Application.Services;

public interface IAccountingService
{
    // Internal posting (called by other services)
    Task PostAsync(JournalEntry entry, CancellationToken ct = default);

    // Chart of accounts
    Task<IReadOnlyList<ChartAccountDto>> GetChartOfAccountsAsync(CancellationToken ct = default);
    Task<ChartAccountDto?> GetAccountByCodeAsync(string code, CancellationToken ct = default);
    Task<ChartAccount> RequireAccountAsync(string code, CancellationToken ct = default);
    Task<ChartAccountDto> CreateChartAccountAsync(CreateChartAccountDto dto, CancellationToken ct = default);
    Task<ChartAccountDto> UpdateChartAccountAsync(long id, UpdateChartAccountDto dto, CancellationToken ct = default);
    Task DeleteChartAccountAsync(long id, CancellationToken ct = default);

    // Journal
    Task<PagedResult<JournalEntryDto>> GetJournalAsync(
        int page = 1,
        int size = 20,
        string? journalCode = null,
        DateTime? from = null,
        DateTime? to = null,
        string? search = null,
        CancellationToken ct = default);

    Task<JournalEntryDto?> GetJournalEntryByIdAsync(long id, CancellationToken ct = default);
    Task<JournalEntryDto> PostManualEntryAsync(ManualJournalEntryInput input, CancellationToken ct = default);

    // Reports
    Task<IReadOnlyList<TrialBalanceLineDto>> GetTrialBalanceAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<PnLDto> GetPnLAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<ThirdPartyLedgerDto?> GetCustomerLedgerAsync(long customerId, DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<ThirdPartyLedgerDto?> GetSupplierLedgerAsync(long supplierId, DateTime? from, DateTime? to, CancellationToken ct = default);
}
