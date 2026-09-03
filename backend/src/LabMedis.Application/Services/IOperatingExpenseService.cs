using LabMedis.Application.Dtos.OperatingExpenses;
using LabMedis.Domain.Common;

namespace LabMedis.Application.Services;

public interface IOperatingExpenseService
{
    Task<PagedResult<OperatingExpenseDto>> GetAllAsync(int page = 1, int size = 20, int? annee = null, int? mois = null, CancellationToken ct = default);
    Task<OperatingExpenseDto?> GetByIdAsync(long id, CancellationToken ct = default);
    Task<OperatingExpenseDto> CreateAsync(OperatingExpenseCreateDto dto, CancellationToken ct = default);
    Task<OperatingExpenseDto> UpdateAsync(long id, OperatingExpenseCreateDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);

    Task<IReadOnlyList<ExpenseBudgetDto>> GetBudgetsAsync(int annee, int mois, CancellationToken ct = default);
    Task<ExpenseBudgetDto> UpsertBudgetAsync(ExpenseBudgetUpsertDto dto, CancellationToken ct = default);
    Task<IReadOnlyList<BudgetVsActuelDto>> GetBudgetVsActuelAsync(int annee, int mois, CancellationToken ct = default);
}
