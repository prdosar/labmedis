using LabMedis.Application.Dtos.Customers;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
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

    public async Task<PagedResult<CustomerDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet.Include(x => x.Country).OrderBy(x => x.Name).Skip(skip).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<CustomerDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet.Include(x => x.Country).OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<CustomerDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<CustomerDto> CreateAsync(CustomerCreateDto dto, CancellationToken cancellationToken = default)
    {
        var name = dto.Name.Trim();
        if (await DbSet.AnyAsync(x => x.Name == name, cancellationToken))
            throw new DomainException($"Un client '{name}' existe déjà.");

        var code = Trim(dto.Code);
        if (code is not null && await DbSet.AnyAsync(x => x.Code == code, cancellationToken))
            throw new DomainException($"Le code client '{code}' est déjà utilisé.");

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
        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        _logger.LogInformation("Client créé Id={Id} Name={Name}", entity.Id, entity.Name);
        return ToDto(entity);
    }

    public async Task<CustomerDto?> UpdateAsync(long id, CustomerUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet.Include(x => x.Country).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;

        var name = dto.Name.Trim();
        if (!string.Equals(entity.Name, name, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
            throw new DomainException($"Un autre client utilise déjà le nom '{name}'.");

        var code = Trim(dto.Code);
        if (code is not null && !string.Equals(entity.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(x => x.Id != id && x.Code == code, cancellationToken))
            throw new DomainException($"Le code client '{code}' est déjà utilisé.");

        entity.Code = code;
        entity.Name = name;
        entity.Address = Trim(dto.Address);
        entity.PostalBox = Trim(dto.PostalBox);
        entity.Phone = Trim(dto.Phone);
        entity.Email = Trim(dto.Email);
        entity.City = Trim(dto.City);
        entity.CountryId = dto.CountryId;
        entity.ContactPerson = Trim(dto.ContactPerson);
        await UpdateAsync(entity, cancellationToken);
        await DbContext.Entry(entity).Reference(x => x.Country).LoadAsync(cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.Invoices.AnyAsync(i => i.CustomerId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un client lié à des factures.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private static CustomerDto ToDto(Customer x) =>
        new(x.Id, x.Code, x.Name, x.Address, x.PostalBox, x.Phone, x.Email, x.City, x.CountryId, x.Country?.Name, x.ContactPerson, x.CreatedAt, x.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
