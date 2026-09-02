using LabMedis.Application.Dtos.Accounting;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class AccountingService : BaseRepository<JournalEntry>, IAccountingService
{
    public AccountingService(AppDbContext dbContext) : base(dbContext)
    {
    }

    // ──────────────────────────────────────────────────────────────
    // Internal posting
    // ──────────────────────────────────────────────────────────────

    public async Task PostAsync(JournalEntry entry, CancellationToken ct = default)
    {
        entry.Validate();
        entry.IsPosted = true;
        DbContext.JournalEntries.Add(entry);
        await DbContext.SaveChangesAsync(ct);
    }

    // ──────────────────────────────────────────────────────────────
    // Chart of accounts
    // ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ChartAccountDto>> GetChartOfAccountsAsync(CancellationToken ct = default)
    {
        var accounts = await DbContext.ChartAccounts
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        return accounts.Select(ToChartAccountDto).ToList();
    }

    public async Task<ChartAccountDto?> GetAccountByCodeAsync(string code, CancellationToken ct = default)
    {
        var account = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Code == code, ct);

        return account is null ? null : ToChartAccountDto(account);
    }

    public async Task<ChartAccount> RequireAccountAsync(string code, CancellationToken ct = default)
    {
        var account = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Code == code, ct);

        if (account is null)
            throw new DomainException($"Compte comptable introuvable : {code}.");

        return account;
    }

    public async Task<ChartAccountDto> CreateChartAccountAsync(CreateChartAccountDto dto, CancellationToken ct = default)
    {
        if (await DbContext.ChartAccounts.AnyAsync(a => a.Code == dto.Code, ct))
            throw new DomainException($"Un compte avec le code '{dto.Code}' existe déjà.");

        if (!Enum.TryParse<AccountClass>(dto.AccountClass, out var accountClass))
            throw new DomainException($"Classe de compte invalide : {dto.AccountClass}.");

        if (!Enum.TryParse<NormalBalance>(dto.NormalBalance, out var normalBalance))
            throw new DomainException($"Sens invalide : {dto.NormalBalance}.");

        if (dto.ParentCode is not null && !await DbContext.ChartAccounts.AnyAsync(a => a.Code == dto.ParentCode, ct))
            throw new DomainException($"Compte parent introuvable : {dto.ParentCode}.");

        var account = new ChartAccount
        {
            Code = dto.Code.Trim(),
            Name = dto.Name.Trim(),
            AccountClass = accountClass,
            NormalBalance = normalBalance,
            IsThirdParty = dto.IsThirdParty,
            IsSystem = false,
            ParentCode = dto.ParentCode?.Trim(),
        };

        DbContext.ChartAccounts.Add(account);
        await DbContext.SaveChangesAsync(ct);
        return ToChartAccountDto(account);
    }

    public async Task<ChartAccountDto> UpdateChartAccountAsync(long id, UpdateChartAccountDto dto, CancellationToken ct = default)
    {
        var account = await DbContext.ChartAccounts.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new DomainException("Compte introuvable.");

        if (account.IsSystem)
            throw new DomainException("Les comptes système ne peuvent pas être modifiés.");

        if (dto.ParentCode is not null && !await DbContext.ChartAccounts.AnyAsync(a => a.Code == dto.ParentCode, ct))
            throw new DomainException($"Compte parent introuvable : {dto.ParentCode}.");

        account.Name = dto.Name.Trim();
        account.IsThirdParty = dto.IsThirdParty;
        account.ParentCode = dto.ParentCode?.Trim();

        await DbContext.SaveChangesAsync(ct);
        return ToChartAccountDto(account);
    }

    public async Task DeleteChartAccountAsync(long id, CancellationToken ct = default)
    {
        var account = await DbContext.ChartAccounts.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new DomainException("Compte introuvable.");

        if (account.IsSystem)
            throw new DomainException("Les comptes système ne peuvent pas être supprimés.");

        if (await DbContext.ChartAccounts.AnyAsync(a => a.ParentCode == account.Code, ct))
            throw new DomainException("Ce compte a des sous-comptes. Supprimez-les d'abord.");

        if (await DbContext.JournalLines.AnyAsync(l => l.AccountId == id, ct))
            throw new DomainException("Ce compte est utilisé dans des écritures comptables et ne peut pas être supprimé.");

        DbContext.ChartAccounts.Remove(account);
        await DbContext.SaveChangesAsync(ct);
    }

    // ──────────────────────────────────────────────────────────────
    // Journal
    // ──────────────────────────────────────────────────────────────

    public async Task<PagedResult<JournalEntryDto>> GetJournalAsync(
        int page = 1,
        int size = 20,
        string? journalCode = null,
        DateTime? from = null,
        DateTime? to = null,
        string? search = null,
        CancellationToken ct = default)
    {
        var query = DbContext.JournalEntries.AsQueryable();

        if (!string.IsNullOrWhiteSpace(journalCode))
            query = query.Where(e => e.JournalCode == journalCode);

        if (from.HasValue)
            query = query.Where(e => e.EntryDate >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.EntryDate <= to.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e =>
                e.Reference.ToLower().Contains(term) ||
                e.Description.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var skip = (page - 1) * size;

        var entries = await query
            .OrderByDescending(e => e.EntryDate)
            .ThenByDescending(e => e.Id)
            .Skip(skip)
            .Take(size)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Account)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Customer)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Supplier)
            .ToListAsync(ct);

        var dtos = entries.Select(ToJournalEntryDto).ToList();
        return new PagedResult<JournalEntryDto>(dtos, total, page, size);
    }

    public async Task<JournalEntryDto?> GetJournalEntryByIdAsync(long id, CancellationToken ct = default)
    {
        var entry = await DbContext.JournalEntries
            .Include(e => e.Lines)
                .ThenInclude(l => l.Account)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Customer)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Supplier)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

        return entry is null ? null : ToJournalEntryDto(entry);
    }

    public async Task<JournalEntryDto> PostManualEntryAsync(ManualJournalEntryInput input, CancellationToken ct = default)
    {
        // Resolve account codes before saving (needed for PurchaseCharge if applicable)
        var accountIds = input.Lines.Select(l => l.AccountId).Distinct().ToList();
        var accountCodes = await DbContext.ChartAccounts
            .Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => a.Code, ct);

        var entry = new JournalEntry
        {
            JournalCode = input.JournalCode,
            EntryDate = input.EntryDate,
            Reference = input.Reference,
            Description = input.Description,
            SourceType = "Manual",
            SourceId = null,
            IsPosted = false,
            AttachmentFileName = input.AttachmentFileName,
            AttachmentPath = input.AttachmentPath
        };

        foreach (var lineInput in input.Lines)
        {
            entry.AddLine(new JournalLine
            {
                AccountId = lineInput.AccountId,
                Label = lineInput.Label,
                DebitAmount = lineInput.DebitAmount,
                CreditAmount = lineInput.CreditAmount,
                CustomerId = lineInput.CustomerId,
                SupplierId = lineInput.SupplierId
            });
        }

        await PostAsync(entry, ct);

        // Optionally link this OD entry to a purchase arrivage (creates a PurchaseCharge)
        if (input.PurchaseId.HasValue)
        {
            var purchase = await DbContext.Purchases
                .Include(p => p.Lines)
                .Include(p => p.Charges)
                .FirstOrDefaultAsync(p => p.Id == input.PurchaseId, ct)
                ?? throw new DomainException($"Arrivage introuvable (id={input.PurchaseId}).");

            var totalAmount = input.Lines.Sum(l => l.DebitAmount);
            var debitAccountId = input.Lines.FirstOrDefault(l => l.DebitAmount > 0)?.AccountId;
            var creditAccountId = input.Lines.FirstOrDefault(l => l.CreditAmount > 0)?.AccountId;

            var charge = new PurchaseCharge
            {
                PurchaseId = purchase.Id,
                ChargeType = input.ChargeType ?? "Autres",
                Description = input.Description,
                AmountXof = totalAmount,
                ChargeDate = DateOnly.FromDateTime(input.EntryDate),
                Reference = input.Reference,
                DebitAccountCode = debitAccountId.HasValue ? (accountCodes.GetValueOrDefault(debitAccountId.Value) ?? "") : "",
                CreditAccountCode = creditAccountId.HasValue ? (accountCodes.GetValueOrDefault(creditAccountId.Value) ?? "") : "",
                JournalEntryId = entry.Id,
                Notes = null
            };

            DbContext.PurchaseCharges.Add(charge);
            purchase.AddCharge(charge); // triggers RecalculateCosts()
            await DbContext.SaveChangesAsync(ct);

            // Update journal entry to reference the charge
            entry.SourceType = "PurchaseCharge";
            entry.SourceId = charge.Id;
            await DbContext.SaveChangesAsync(ct);
        }

        // Reload with navigations
        var saved = await DbContext.JournalEntries
            .Include(e => e.Lines)
                .ThenInclude(l => l.Account)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Customer)
            .Include(e => e.Lines)
                .ThenInclude(l => l.Supplier)
            .FirstAsync(e => e.Id == entry.Id, ct);

        return ToJournalEntryDto(saved);
    }

    // ──────────────────────────────────────────────────────────────
    // Reports
    // ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TrialBalanceLineDto>> GetTrialBalanceAsync(
        DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var linesQuery = DbContext.JournalLines
            .Include(l => l.Account)
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted);

        if (from.HasValue)
            linesQuery = linesQuery.Where(l => l.JournalEntry!.EntryDate >= from.Value);

        if (to.HasValue)
            linesQuery = linesQuery.Where(l => l.JournalEntry!.EntryDate <= to.Value);

        var grouped = await linesQuery
            .GroupBy(l => new { l.AccountId, l.Account!.Code, l.Account.Name, l.Account.AccountClass, l.Account.NormalBalance })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.Code,
                g.Key.Name,
                g.Key.AccountClass,
                g.Key.NormalBalance,
                TotalDebit = g.Sum(l => l.DebitAmount),
                TotalCredit = g.Sum(l => l.CreditAmount)
            })
            .OrderBy(g => g.Code)
            .ToListAsync(ct);

        return grouped.Select(g =>
        {
            var balance = g.NormalBalance == NormalBalance.Debit
                ? g.TotalDebit - g.TotalCredit
                : g.TotalCredit - g.TotalDebit;

            return new TrialBalanceLineDto(
                g.AccountId,
                g.Code,
                g.Name,
                g.AccountClass.ToString(),
                g.TotalDebit,
                g.TotalCredit,
                balance);
        }).ToList();
    }

    public async Task<PnLDto> GetPnLAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var linesQuery = DbContext.JournalLines
            .Include(l => l.Account)
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted &&
                        (l.Account!.AccountClass == AccountClass.Income ||
                         l.Account.AccountClass == AccountClass.Expense));

        if (from.HasValue)
            linesQuery = linesQuery.Where(l => l.JournalEntry!.EntryDate >= from.Value);

        if (to.HasValue)
            linesQuery = linesQuery.Where(l => l.JournalEntry!.EntryDate <= to.Value);

        var grouped = await linesQuery
            .GroupBy(l => new { l.AccountId, l.Account!.Code, l.Account.Name, l.Account.AccountClass, l.Account.NormalBalance })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.Code,
                g.Key.Name,
                g.Key.AccountClass,
                g.Key.NormalBalance,
                TotalDebit = g.Sum(l => l.DebitAmount),
                TotalCredit = g.Sum(l => l.CreditAmount)
            })
            .OrderBy(g => g.Code)
            .ToListAsync(ct);

        var incomeLines = new List<PnLLineDto>();
        var expenseLines = new List<PnLLineDto>();

        foreach (var g in grouped)
        {
            // Income accounts (class 7): normal balance = Credit → amount = credits - debits
            // Expense accounts (class 6): normal balance = Debit → amount = debits - credits
            var amount = g.NormalBalance == NormalBalance.Debit
                ? g.TotalDebit - g.TotalCredit
                : g.TotalCredit - g.TotalDebit;

            var lineDto = new PnLLineDto(g.AccountId, g.Code, g.Name, amount);

            if (g.AccountClass == AccountClass.Income)
                incomeLines.Add(lineDto);
            else
                expenseLines.Add(lineDto);
        }

        var totalIncome = incomeLines.Sum(l => l.Amount);
        var totalExpenses = expenseLines.Sum(l => l.Amount);

        return new PnLDto(incomeLines, expenseLines, totalIncome, totalExpenses, totalIncome - totalExpenses);
    }

    public async Task<ThirdPartyLedgerDto?> GetCustomerLedgerAsync(
        long customerId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var customer = await DbContext.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer is null) return null;

        var entries = await BuildThirdPartyLedger(
            l => l.CustomerId == customerId, from, to, ct);

        var totalDebit = entries.Sum(e => e.DebitAmount);
        var totalCredit = entries.Sum(e => e.CreditAmount);

        // Customer 411 = Debit normal balance → balance = debit - credit
        var balance = totalDebit - totalCredit;

        return new ThirdPartyLedgerDto(
            "Customer", customerId, customer.Name,
            totalDebit, totalCredit, balance, entries);
    }

    public async Task<ThirdPartyLedgerDto?> GetSupplierLedgerAsync(
        long supplierId, DateTime? from, DateTime? to, CancellationToken ct = default)
    {
        var supplier = await DbContext.Suppliers.FirstOrDefaultAsync(s => s.Id == supplierId, ct);
        if (supplier is null) return null;

        var entries = await BuildThirdPartyLedger(
            l => l.SupplierId == supplierId, from, to, ct);

        var totalDebit = entries.Sum(e => e.DebitAmount);
        var totalCredit = entries.Sum(e => e.CreditAmount);

        // Supplier 401 = Credit normal balance → balance = credit - debit
        var balance = totalCredit - totalDebit;

        return new ThirdPartyLedgerDto(
            "Supplier", supplierId, supplier.Name,
            totalDebit, totalCredit, balance, entries);
    }

    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    private async Task<IReadOnlyList<ThirdPartyLedgerEntryDto>> BuildThirdPartyLedger(
        System.Linq.Expressions.Expression<Func<JournalLine, bool>> filter,
        DateTime? from,
        DateTime? to,
        CancellationToken ct)
    {
        var query = DbContext.JournalLines
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry != null && l.JournalEntry.IsPosted)
            .Where(filter);

        if (from.HasValue)
            query = query.Where(l => l.JournalEntry!.EntryDate >= from.Value);

        if (to.HasValue)
            query = query.Where(l => l.JournalEntry!.EntryDate <= to.Value);

        var lines = await query
            .OrderBy(l => l.JournalEntry!.EntryDate)
            .ThenBy(l => l.JournalEntry!.Id)
            .ToListAsync(ct);

        var result = new List<ThirdPartyLedgerEntryDto>();
        decimal runningBalance = 0;

        foreach (var line in lines)
        {
            runningBalance += line.DebitAmount - line.CreditAmount;
            result.Add(new ThirdPartyLedgerEntryDto(
                line.JournalEntryId,
                line.JournalEntry!.EntryDate,
                line.JournalEntry.JournalCode,
                line.JournalEntry.Reference,
                line.JournalEntry.Description,
                line.DebitAmount,
                line.CreditAmount,
                runningBalance));
        }

        return result;
    }

    private static ChartAccountDto ToChartAccountDto(ChartAccount a) => new(
        a.Id,
        a.Code,
        a.Name,
        a.AccountClass.ToString(),
        a.NormalBalance.ToString(),
        a.IsThirdParty,
        a.IsSystem,
        a.ParentCode,
        a.CreatedAt);

    private static JournalEntryDto ToJournalEntryDto(JournalEntry e) => new(
        e.Id,
        e.JournalCode,
        e.EntryDate,
        e.Reference,
        e.Description,
        e.SourceType,
        e.SourceId,
        e.IsPosted,
        e.AttachmentFileName,
        e.AttachmentPath,
        e.Lines.Select(ToJournalLineDto).ToList(),
        e.CreatedAt);

    private static JournalLineDto ToJournalLineDto(JournalLine l) => new(
        l.Id,
        l.AccountId,
        l.Account?.Code ?? string.Empty,
        l.Account?.Name ?? string.Empty,
        l.Label,
        l.DebitAmount,
        l.CreditAmount,
        l.CustomerId,
        l.Customer?.Name,
        l.SupplierId,
        l.Supplier?.Name);
}
