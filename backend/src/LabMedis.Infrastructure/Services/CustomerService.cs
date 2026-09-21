using LabMedis.Application.Dtos.Customers;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class CustomerService : BaseRepository<Customer>, ICustomerService
{
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(AppDbContext dbContext, ILogger<CustomerService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<CustomerDto>> GetAllAsync(int page = 1, int size = 10, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        var q = includeDeleted ? DbSet.IgnoreQueryFilters().AsQueryable() : DbSet.AsQueryable();
        var skip = (page - 1) * size;
        var total = await q.CountAsync(cancellationToken);
        var items = await q.Include(x => x.Country).Include(x => x.ChartAccount).OrderBy(x => x.IsDeleted).ThenBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        var balances = await GetBalancesAsync(items.Select(x => x.Id).ToList(), cancellationToken);
        return new PagedResult<CustomerDto>(items.Select(x => ToDto(x, balances.GetValueOrDefault(x.Id))).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).OrderBy(x => x.Name).ToListAsync(cancellationToken);
        var balances = await GetBalancesAsync(items.Select(x => x.Id).ToList(), cancellationToken);
        return items.Select(x => ToDto(x, balances.GetValueOrDefault(x.Id))).ToList();
    }

    public async Task<CustomerDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is null) return null;
        var balance = (await GetBalancesAsync(new[] { id }, cancellationToken)).GetValueOrDefault(id);
        return ToDto(item, balance);
    }

    public async Task<CustomerDto> CreateAsync(CustomerCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un client '{name}' existe déjà.");

        var code = await NextCodeAsync(cancellationToken);

        var entity = new Customer
        {
            Code = code,
            Name = name,
            Address = Trim(dto.Address),
            PostalBox = Trim(dto.PostalBox),
            Phone = Trim(dto.Phone),
            Email = Trim(dto.Email),
            City = Trim(dto.City),
            CountryId = dto.CountryId,
            ContactPerson = Trim(dto.ContactPerson)
        };
        await CreateAsync(entity, cancellationToken);

        // Sous-compte comptable client : saisi manuellement par l'utilisateur.
        // Si non fourni, laisser vide — le comptable devra le renseigner avant toute
        // interaction commerciale (bloqué dans CustomerOrderService.CreateAsync).
        var chartAccountCode = Trim(dto.ChartAccountCode);
        if (chartAccountCode is not null)
        {
            var chartAccount = await AttachOrCreateChartAccountAsync(chartAccountCode, name, cancellationToken);
            entity.ChartAccountId = chartAccount.Id;
            await DbContext.SaveChangesAsync(cancellationToken);
        }

        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.ChartAccount).LoadAsync(cancellationToken);
        _logger.LogInformation("Client créé Id={Id} Name={Name} Code={Code} ChartAccount={ChartCode}", entity.Id, entity.Name, entity.Code, entity.ChartAccount?.Code ?? "(vide)");
        return ToDto(entity, 0);
    }

    public async Task<CustomerDto?> UpdateAsync(long id, CustomerUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre client utilise déjà le nom '{name}'.");

        entity.Name = name;
        entity.Address = Trim(dto.Address);
        entity.PostalBox = Trim(dto.PostalBox);
        entity.Phone = Trim(dto.Phone);
        entity.Email = Trim(dto.Email);
        entity.City = Trim(dto.City);
        entity.CountryId = dto.CountryId;
        entity.ContactPerson = Trim(dto.ContactPerson);

        // Gestion du sous-compte comptable :
        // - vide + pas encore de compte → on ne fait rien (client toujours en attente).
        // - vide + un compte est lié → on ne détache pas (des écritures peuvent exister).
        // - non vide + pas encore de compte → on rattache ou on crée.
        // - non vide + compte existant, code différent → on renomme.
        var chartAccountCode = Trim(dto.ChartAccountCode);
        if (chartAccountCode is not null)
        {
            if (entity.ChartAccount is null)
            {
                var chartAccount = await AttachOrCreateChartAccountAsync(chartAccountCode, name, cancellationToken);
                entity.ChartAccountId = chartAccount.Id;
            }
            else if (!string.Equals(entity.ChartAccount.Code, chartAccountCode, StringComparison.Ordinal))
            {
                await RenameChartAccountAsync(entity.ChartAccount, chartAccountCode, cancellationToken);
            }
        }

        await UpdateAsync(entity, cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.ChartAccount).LoadAsync(cancellationToken);
        var balance = (await GetBalancesAsync(new[] { id }, cancellationToken)).GetValueOrDefault(id);
        return ToDto(entity, balance);
    }

    private async Task<ChartAccount> AttachOrCreateChartAccountAsync(string code, string customerName, CancellationToken ct)
    {
        var existing = await DbContext.ChartAccounts.FirstOrDefaultAsync(a => a.Code == code, ct);
        if (existing is not null)
        {
            var linkedTo = await DbSet.FirstOrDefaultAsync(c => c.ChartAccountId == existing.Id, ct);
            if (linkedTo is not null)
                throw new DomainException($"Le sous-compte '{code}' est déjà rattaché au client '{linkedTo.Name}'.");
            return existing;
        }

        var account = new ChartAccount
        {
            Code = code,
            Name = $"Client – {customerName}",
            AccountClass = AccountClass.ThirdParty,
            NormalBalance = NormalBalance.Debit,
            IsThirdParty = true,
            IsSystem = false,
            ParentCode = "411"
        };
        DbContext.ChartAccounts.Add(account);
        await DbContext.SaveChangesAsync(ct);
        return account;
    }

    private async Task RenameChartAccountAsync(ChartAccount account, string newCode, CancellationToken ct)
    {
        if (account.IsSystem)
            throw new DomainException("Ce sous-compte est marqué système et ne peut pas être renommé.");
        if (await DbContext.ChartAccounts.AnyAsync(a => a.Id != account.Id && a.Code == newCode, ct))
            throw new DomainException($"Un autre compte utilise déjà le code '{newCode}'.");

        var oldCode = account.Code;
        var children = await DbContext.ChartAccounts.Where(a => a.ParentCode == oldCode).ToListAsync(ct);
        foreach (var child in children)
            child.ParentCode = newCode;
        account.Code = newCode;
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Invoices.AnyAsync(i => i.CustomerId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un client lié à des factures.");

        if (await DbContext.CustomerOrders.AnyAsync(o => o.CustomerId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un client lié à des commandes.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private async Task<string> NextCodeAsync(CancellationToken ct)
    {
        var codes = await DbSet.IgnoreQueryFilters().Select(x => x.Code).ToListAsync(ct);
        var max = codes.Where(c => int.TryParse(c, out _)).Select(c => int.Parse(c)).DefaultIfEmpty(0).Max();
        return (max + 1).ToString("D2");
    }

    private async Task<Dictionary<long, decimal>> GetBalancesAsync(IEnumerable<long> customerIds, CancellationToken ct)
    {
        var ids = customerIds.ToList();
        if (ids.Count == 0) return new Dictionary<long, decimal>();

        var rows = await DbContext.JournalLines
            .Where(l => l.CustomerId.HasValue && ids.Contains(l.CustomerId!.Value))
            .GroupBy(l => l.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Balance = g.Sum(l => l.DebitAmount) - g.Sum(l => l.CreditAmount) })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.CustomerId, r => r.Balance);
    }

    private static CustomerDto ToDto(Customer x, decimal balance) =>
        new(x.Id, x.Code, x.Name, x.Address, x.PostalBox, x.Phone, x.Email, x.City, x.CountryId, x.Country?.Name, x.ContactPerson,
            x.ChartAccountId, x.ChartAccount?.Code, balance, x.IsDeleted, x.CreatedAt, x.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
