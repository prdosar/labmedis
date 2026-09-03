using LabMedis.Application.Dtos.OperatingExpenses;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class OperatingExpenseService : BaseRepository<OperatingExpense>, IOperatingExpenseService
{
    private readonly ILogger<OperatingExpenseService> _logger;

    public OperatingExpenseService(AppDbContext dbContext, ILogger<OperatingExpenseService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<OperatingExpenseDto>> GetAllAsync(int page = 1, int size = 20, int? annee = null, int? mois = null, CancellationToken ct = default)
    {
        var query = DbSet.AsQueryable();
        if (annee.HasValue) query = query.Where(x => x.Date.Year == annee.Value);
        if (mois.HasValue) query = query.Where(x => x.Date.Month == mois.Value);

        var skip = (page - 1) * size;
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.Date)
            .Skip(skip).Take(size)
            .ToListAsync(ct);
        return new PagedResult<OperatingExpenseDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<OperatingExpenseDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var entity = await DbSet.FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<OperatingExpenseDto> CreateAsync(OperatingExpenseCreateDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new DomainException("La description est obligatoire.");
        if (dto.Montant <= 0)
            throw new DomainException("Le montant doit être positif.");

        var entity = new OperatingExpense
        {
            Date = dto.Date,
            Categorie = dto.Categorie,
            Description = dto.Description.Trim(),
            Montant = dto.Montant,
            ModePaiement = dto.ModePaiement,
            Reference = Trim(dto.Reference),
            Notes = Trim(dto.Notes),
        };

        await CreateAsync(entity, ct);
        _logger.LogInformation("Charge créée Id={Id} Catégorie={Cat} Montant={M}", entity.Id, entity.Categorie, entity.Montant);
        return ToDto(entity);
    }

    public async Task<OperatingExpenseDto> UpdateAsync(long id, OperatingExpenseCreateDto dto, CancellationToken ct = default)
    {
        var entity = await DbSet.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new DomainException($"Charge introuvable (Id={id}).");

        entity.Date = dto.Date;
        entity.Categorie = dto.Categorie;
        entity.Description = dto.Description.Trim();
        entity.Montant = dto.Montant;
        entity.ModePaiement = dto.ModePaiement;
        entity.Reference = Trim(dto.Reference);
        entity.Notes = Trim(dto.Notes);

        await UpdateAsync(entity, ct);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
        => await SoftDeleteAsync(id, ct);

    public async Task<IReadOnlyList<ExpenseBudgetDto>> GetBudgetsAsync(int annee, int mois, CancellationToken ct = default)
    {
        var budgets = await DbContext.ExpenseBudgets
            .Where(b => b.Annee == annee && b.Mois == mois)
            .ToListAsync(ct);
        return budgets.Select(ToBudgetDto).ToList();
    }

    public async Task<ExpenseBudgetDto> UpsertBudgetAsync(ExpenseBudgetUpsertDto dto, CancellationToken ct = default)
    {
        if (dto.MontantBudget < 0)
            throw new DomainException("Le montant du budget ne peut pas être négatif.");

        var existing = await DbContext.ExpenseBudgets
            .FirstOrDefaultAsync(b => b.Annee == dto.Annee && b.Mois == dto.Mois && b.Categorie == dto.Categorie, ct);

        if (existing is not null)
        {
            existing.MontantBudget = dto.MontantBudget;
            DbContext.ExpenseBudgets.Update(existing);
            await DbContext.SaveChangesAsync(ct);
            return ToBudgetDto(existing);
        }

        var budget = new ExpenseBudget
        {
            Annee = dto.Annee,
            Mois = dto.Mois,
            Categorie = dto.Categorie,
            MontantBudget = dto.MontantBudget,
        };
        DbContext.ExpenseBudgets.Add(budget);
        await DbContext.SaveChangesAsync(ct);
        return ToBudgetDto(budget);
    }

    public async Task<IReadOnlyList<BudgetVsActuelDto>> GetBudgetVsActuelAsync(int annee, int mois, CancellationToken ct = default)
    {
        var budgets = await DbContext.ExpenseBudgets
            .Where(b => b.Annee == annee && b.Mois == mois)
            .ToListAsync(ct);

        var expensesQuery = DbContext.OperatingExpenses
            .Where(e => e.Date.Year == annee);
        if (mois > 0)
            expensesQuery = expensesQuery.Where(e => e.Date.Month == mois);

        var expenses = await expensesQuery
            .GroupBy(e => e.Categorie)
            .Select(g => new { Categorie = g.Key, Total = g.Sum(e => e.Montant) })
            .ToListAsync(ct);

        var categories = Enum.GetValues<ExpenseCategory>();
        var result = new List<BudgetVsActuelDto>();

        foreach (var cat in categories)
        {
            var budget = budgets.FirstOrDefault(b => b.Categorie == cat)?.MontantBudget ?? 0m;
            var realise = expenses.FirstOrDefault(e => e.Categorie == cat)?.Total ?? 0m;
            var ecart = budget - realise;
            var pct = budget > 0 ? Math.Round(realise / budget * 100, 1) : 0m;
            result.Add(new BudgetVsActuelDto(cat.ToString(), budget, realise, ecart, pct));
        }

        return result;
    }

    private static OperatingExpenseDto ToDto(OperatingExpense e) => new(
        e.Id,
        e.Date.ToString("yyyy-MM-dd"),
        e.Categorie.ToString(),
        e.Description,
        e.Montant,
        e.ModePaiement.ToString(),
        e.Reference,
        e.Notes,
        e.CreatedAt,
        e.UpdatedAt);

    private static ExpenseBudgetDto ToBudgetDto(ExpenseBudget b) => new(
        b.Id, b.Annee, b.Mois, b.Categorie.ToString(), b.MontantBudget);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
