using LabMedis.Application.Dtos.Suppliers;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class SupplierService : BaseRepository<Supplier>, ISupplierService
{
    private readonly ILogger<SupplierService> _logger;

    public SupplierService(AppDbContext dbContext, ILogger<SupplierService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<SupplierDto>> GetAllAsync(int page = 1, int size = 10, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        var q = includeDeleted ? DbSet.IgnoreQueryFilters().AsQueryable() : DbSet.AsQueryable();
        var skip = (page - 1) * size;
        var total = await q.CountAsync(cancellationToken);
        var items = await q.Include(x => x.Country).Include(x => x.ChartAccount).OrderBy(x => x.IsDeleted).ThenBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<SupplierDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<SupplierDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<SupplierDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<SupplierDto> CreateAsync(SupplierCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un fournisseur '{name}' existe déjà.");

        var code = await NextCodeAsync(cancellationToken);
        var entity = new Supplier
        {
            Code = code,
            Name = name,
            Address = Trim(dto.Address),
            PostalBox = Trim(dto.PostalBox),
            Phone = Trim(dto.Phone),
            Email = Trim(dto.Email),
            CountryId = dto.CountryId,
            ContactPerson = Trim(dto.ContactPerson)
        };
        await CreateAsync(entity, cancellationToken);

        // Sous-compte comptable fournisseur : saisi manuellement.
        // Si non fourni, laisser vide — bloqué à la première commande fournisseur.
        var chartAccountCode = Trim(dto.ChartAccountCode);
        if (chartAccountCode is not null)
        {
            var chartAccount = await AttachOrCreateChartAccountAsync(chartAccountCode, name, cancellationToken);
            entity.ChartAccountId = chartAccount.Id;
            await DbContext.SaveChangesAsync(cancellationToken);
        }

        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.ChartAccount).LoadAsync(cancellationToken);
        _logger.LogInformation("Fournisseur créé Id={Id} Name={Name} ChartAccount={ChartCode}", entity.Id, entity.Name, entity.ChartAccount?.Code ?? "(vide)");
        return ToDto(entity);
    }

    public async Task<SupplierDto?> UpdateAsync(long id, SupplierUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet.Include(x => x.Country).Include(x => x.ChartAccount).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre fournisseur utilise déjà le nom '{name}'.");

        entity.Name = name;
        entity.Address = Trim(dto.Address);
        entity.PostalBox = Trim(dto.PostalBox);
        entity.Phone = Trim(dto.Phone);
        entity.Email = Trim(dto.Email);
        entity.CountryId = dto.CountryId;
        entity.ContactPerson = Trim(dto.ContactPerson);

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
        return ToDto(entity);
    }

    private async Task<ChartAccount> AttachOrCreateChartAccountAsync(string code, string supplierName, CancellationToken ct)
    {
        var existing = await DbContext.ChartAccounts.FirstOrDefaultAsync(a => a.Code == code, ct);
        if (existing is not null)
        {
            var linkedTo = await DbSet.FirstOrDefaultAsync(s => s.ChartAccountId == existing.Id, ct);
            if (linkedTo is not null)
                throw new DomainException($"Le sous-compte '{code}' est déjà rattaché au fournisseur '{linkedTo.Name}'.");
            return existing;
        }

        var account = new ChartAccount
        {
            Code = code,
            Name = $"Fournisseur – {supplierName}",
            AccountClass = AccountClass.ThirdParty,
            NormalBalance = NormalBalance.Credit,
            IsThirdParty = true,
            IsSystem = false,
            ParentCode = "401"
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

        if (await DbContext.Products.AnyAsync(p => p.SupplierId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un fournisseur lié à des produits.");

        if (await DbContext.Purchases.AnyAsync(p => p.SupplierId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un fournisseur lié à des arrivages.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private async Task<string> NextCodeAsync(CancellationToken ct)
    {
        var codes = await DbSet.IgnoreQueryFilters()
            .Select(x => x.Code).ToListAsync(ct);
        var max = codes
            .Where(c => int.TryParse(c, out _))
            .Select(c => int.Parse(c))
            .DefaultIfEmpty(0).Max();
        return (max + 1).ToString("D2");
    }

    private static SupplierDto ToDto(Supplier x) =>
        new(x.Id, x.Code, x.Name, x.Address, x.PostalBox, x.Phone, x.Email, x.CountryId, x.Country?.Name, x.ContactPerson,
            x.ChartAccountId, x.ChartAccount?.Code, x.IsDeleted, x.CreatedAt, x.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
