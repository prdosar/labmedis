using LabMedis.Application.Dtos.Purchases;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class PurchaseService : BaseRepository<Purchase>, IPurchaseService
{
    private readonly ILogger<PurchaseService> _logger;

    public PurchaseService(AppDbContext dbContext, ILogger<PurchaseService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<PurchaseDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet
            .Include(p => p.Supplier)
            .Include(p => p.Lines).ThenInclude(l => l.Product)
            .Include(p => p.Lines).ThenInclude(l => l.Transports).ThenInclude(t => t.TransportType)
            .OrderByDescending(p => p.PurchaseDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<PurchaseDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<PurchaseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await LoadAggregateAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<PurchaseDto> CreateAsync(PurchaseCreateDto dto, CancellationToken cancellationToken = default)
    {
        var reference = dto.Reference.Trim();
        if (await DbSet.AnyAsync(p => p.Reference == reference, cancellationToken))
            throw new DomainException($"Un arrivage avec la référence '{reference}' existe déjà.");

        if (!await DbContext.Suppliers.AnyAsync(s => s.Id == dto.SupplierId, cancellationToken))
            throw new DomainException($"Fournisseur introuvable (Id={dto.SupplierId}).");

        var entity = new Purchase
        {
            Reference = reference,
            PurchaseDate = dto.PurchaseDate,
            ArrivalDate = dto.ArrivalDate,
            SupplierId = dto.SupplierId,
            PurchaseCurrency = dto.PurchaseCurrency,
            ContainerReference = Trim(dto.ContainerReference),
            Notes = Trim(dto.Notes)
        };
        entity.SetExchangeRate(dto.ExchangeRateToXof);
        entity.SetCoefficients(dto.CommissionCoefficient, dto.FreightCoefficient, dto.TransitCoefficient,
            dto.TransferFeesCoefficient, dto.DefaultMarginCoefficient);

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Arrivage créé Id={Id} Reference={Reference}", entity.Id, entity.Reference);
        return ToDto(entity);
    }

    public async Task<PurchaseDto?> UpdateAsync(long id, PurchaseUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await LoadAggregateAsync(id, cancellationToken);
        if (entity is null) return null;

        var reference = dto.Reference.Trim();
        if (!string.Equals(entity.Reference, reference, StringComparison.Ordinal)
            && await DbSet.AnyAsync(p => p.Id != id && p.Reference == reference, cancellationToken))
            throw new DomainException($"Un autre arrivage utilise déjà la référence '{reference}'.");

        entity.Reference = reference;
        entity.PurchaseDate = dto.PurchaseDate;
        entity.ArrivalDate = dto.ArrivalDate;
        entity.PurchaseCurrency = dto.PurchaseCurrency;
        entity.ContainerReference = Trim(dto.ContainerReference);
        entity.Notes = Trim(dto.Notes);
        entity.SetExchangeRate(dto.ExchangeRateToXof);
        entity.SetCoefficients(dto.CommissionCoefficient, dto.FreightCoefficient, dto.TransitCoefficient,
            dto.TransferFeesCoefficient, dto.DefaultMarginCoefficient);

        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.PurchaseLines.AnyAsync(l => l.PurchaseId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un arrivage qui contient des lignes.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public async Task<PurchaseLineDto> AddLineAsync(long purchaseId, PurchaseLineCreateDto dto, CancellationToken cancellationToken = default)
    {
        var purchase = await LoadAggregateAsync(purchaseId, cancellationToken)
            ?? throw new DomainException($"Arrivage introuvable (Id={purchaseId}).");

        var product = await DbContext.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId, cancellationToken)
            ?? throw new DomainException($"Produit introuvable (Id={dto.ProductId}).");

        var line = purchase.AddLine(product, dto.LotNumber, dto.Quantity, dto.UnitPurchasePrice,
            dto.ExpirationDate, dto.TargetSellingPriceHt);

        await UpdateAsync(purchase, cancellationToken);
        _logger.LogInformation("Ligne ajoutée à l'arrivage Id={PurchaseId} LotNumber={Lot}", purchaseId, line.LotNumber);
        return ToLineDto(line);
    }

    public async Task<bool> RemoveLineAsync(long purchaseId, long lineId, CancellationToken cancellationToken = default)
    {
        var line = await DbContext.PurchaseLines
            .FirstOrDefaultAsync(l => l.Id == lineId && l.PurchaseId == purchaseId, cancellationToken);
        if (line is null) return false;

        if (await DbContext.StockMovements.AnyAsync(m => m.PurchaseLineId == lineId, cancellationToken))
            throw new DomainException("Impossible de supprimer un lot déjà mouvementé en stock.");

        if (await DbContext.DeliveryLines.AnyAsync(d => d.PurchaseLineId == lineId, cancellationToken))
            throw new DomainException("Impossible de supprimer un lot déjà utilisé dans une livraison.");

        DbContext.PurchaseLines.Remove(line);
        await DbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PurchaseLineTransportDto> AddTransportAsync(long purchaseId, long lineId, PurchaseLineTransportCreateDto dto, CancellationToken cancellationToken = default)
    {
        var purchase = await LoadAggregateAsync(purchaseId, cancellationToken)
            ?? throw new DomainException($"Arrivage introuvable (Id={purchaseId}).");

        var line = purchase.Lines.FirstOrDefault(l => l.Id == lineId)
            ?? throw new DomainException($"Ligne introuvable (Id={lineId}) dans cet arrivage.");

        var transportType = await DbContext.TransportTypes.FirstOrDefaultAsync(t => t.Id == dto.TransportTypeId, cancellationToken)
            ?? throw new DomainException($"Mode de transport introuvable (Id={dto.TransportTypeId}).");

        var transport = line.AddTransport(transportType, dto.Quantity);
        await UpdateAsync(purchase, cancellationToken);
        return ToTransportDto(transport);
    }

    public async Task<PurchaseLineTransportDto?> UpdateTransportAsync(long purchaseId, long lineId, long transportTypeId, PurchaseLineTransportUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var purchase = await LoadAggregateAsync(purchaseId, cancellationToken)
            ?? throw new DomainException($"Arrivage introuvable (Id={purchaseId}).");

        var line = purchase.Lines.FirstOrDefault(l => l.Id == lineId)
            ?? throw new DomainException($"Ligne introuvable (Id={lineId}) dans cet arrivage.");

        line.ChangeTransportQuantity(transportTypeId, dto.Quantity);
        await UpdateAsync(purchase, cancellationToken);

        var transport = line.Transports.FirstOrDefault(t => t.TransportTypeId == transportTypeId);
        return transport is null ? null : ToTransportDto(transport);
    }

    public async Task<bool> RemoveTransportAsync(long purchaseId, long lineId, long transportTypeId, CancellationToken cancellationToken = default)
    {
        var purchase = await LoadAggregateAsync(purchaseId, cancellationToken);
        if (purchase is null) return false;

        var line = purchase.Lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null) return false;

        line.RemoveTransport(transportTypeId);
        await UpdateAsync(purchase, cancellationToken);
        return true;
    }

    private async Task<Purchase?> LoadAggregateAsync(long id, CancellationToken ct)
        => await DbSet
            .Include(p => p.Supplier)
            .Include(p => p.Lines).ThenInclude(l => l.Product)
            .Include(p => p.Lines).ThenInclude(l => l.Transports).ThenInclude(t => t.TransportType)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    private static PurchaseDto ToDto(Purchase p) => new(
        p.Id, p.Reference, p.PurchaseDate, p.ArrivalDate,
        p.SupplierId, p.Supplier?.Name,
        p.PurchaseCurrency, p.ExchangeRateToXof,
        p.CommissionCoefficient, p.FreightCoefficient, p.TransitCoefficient,
        p.TransferFeesCoefficient, p.DefaultMarginCoefficient,
        p.ContainerReference, p.Notes,
        p.Lines.Select(ToLineDto).ToList(),
        p.CreatedAt, p.UpdatedAt);

    private static PurchaseLineDto ToLineDto(PurchaseLine l) => new(
        l.Id, l.PurchaseId, l.ProductId,
        l.Product?.Code, l.Product?.Designation,
        l.LotNumber, l.ExpirationDate,
        l.Quantity, l.QuantityRemaining,
        l.UnitPurchasePrice, l.UnitPurchasePriceXof, l.UnitCostPriceXof,
        l.TargetSellingPriceHt,
        l.Transports.Select(ToTransportDto).ToList());

    private static PurchaseLineTransportDto ToTransportDto(PurchaseLineTransport t) => new(
        t.Id, t.TransportTypeId, t.TransportType?.Code, t.TransportType?.Name, t.Quantity);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
