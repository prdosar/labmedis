using LabMedis.Application.Dtos.Deliveries;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class DeliveryService : BaseRepository<Delivery>, IDeliveryService
{
    private readonly ILogger<DeliveryService> _logger;

    public DeliveryService(AppDbContext dbContext, ILogger<DeliveryService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<DeliveryDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet
            .Include(d => d.Invoice)
            .Include(d => d.Lines).ThenInclude(l => l.PurchaseLine)
            .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.Product)
            .OrderByDescending(d => d.DeliveryDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<DeliveryDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<DeliveryDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await LoadAggregateAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<DeliveryDto> CreateAsync(DeliveryCreateDto dto, CancellationToken cancellationToken = default)
    {
        var reference = dto.Reference.Trim();
        if (await DbSet.AnyAsync(d => d.Reference == reference, cancellationToken))
            throw new DomainException($"Un bon de livraison avec la référence '{reference}' existe déjà.");

        if (!await DbContext.Invoices.AnyAsync(i => i.Id == dto.InvoiceId, cancellationToken))
            throw new DomainException($"Facture introuvable (Id={dto.InvoiceId}).");

        var entity = new Delivery
        {
            Reference = reference,
            DeliveryDate = dto.DeliveryDate,
            InvoiceId = dto.InvoiceId,
            DeliveryAddress = Trim(dto.DeliveryAddress),
            RecipientName = Trim(dto.RecipientName),
            CarrierName = Trim(dto.CarrierName),
            TrackingNumber = Trim(dto.TrackingNumber),
            Notes = Trim(dto.Notes)
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("BL créé Id={Id} Reference={Reference}", entity.Id, entity.Reference);
        return ToDto(entity);
    }

    public async Task<DeliveryDto?> UpdateAsync(long id, DeliveryUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await LoadAggregateAsync(id, cancellationToken);
        if (entity is null) return null;

        var reference = dto.Reference.Trim();
        if (!string.Equals(entity.Reference, reference, StringComparison.Ordinal)
            && await DbSet.AnyAsync(d => d.Id != id && d.Reference == reference, cancellationToken))
            throw new DomainException($"Un autre BL utilise déjà la référence '{reference}'.");

        entity.Reference = reference;
        entity.DeliveryDate = dto.DeliveryDate;
        entity.DeliveryAddress = Trim(dto.DeliveryAddress);
        entity.RecipientName = Trim(dto.RecipientName);
        entity.CarrierName = Trim(dto.CarrierName);
        entity.TrackingNumber = Trim(dto.TrackingNumber);
        entity.Notes = Trim(dto.Notes);

        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (entity.Status != Domain.Enums.DeliveryStatus.Pending)
            throw new DomainException("Seul un BL en préparation peut être supprimé.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public async Task<DeliveryLineDto> AddLineAsync(long deliveryId, DeliveryLineCreateDto dto, CancellationToken cancellationToken = default)
    {
        var delivery = await LoadAggregateAsync(deliveryId, cancellationToken)
            ?? throw new DomainException($"Bon de livraison introuvable (Id={deliveryId}).");

        var invoiceLine = await DbContext.InvoiceLines
            .Include(l => l.DeliveryLines)
            .Include(l => l.Product)
            .FirstOrDefaultAsync(l => l.Id == dto.InvoiceLineId, cancellationToken)
            ?? throw new DomainException($"Ligne de facture introuvable (Id={dto.InvoiceLineId}).");

        var purchaseLine = await DbContext.PurchaseLines
            .FirstOrDefaultAsync(l => l.Id == dto.PurchaseLineId, cancellationToken)
            ?? throw new DomainException($"Ligne d'arrivage introuvable (Id={dto.PurchaseLineId}).");

        var line = delivery.AddLine(invoiceLine, purchaseLine, dto.QuantityDelivered);
        await UpdateAsync(delivery, cancellationToken);
        _logger.LogInformation("Ligne ajoutée au BL Id={DeliveryId}", deliveryId);
        return ToLineDto(line);
    }

    public async Task<bool> RemoveLineAsync(long deliveryId, long lineId, CancellationToken cancellationToken = default)
    {
        var delivery = await LoadAggregateAsync(deliveryId, cancellationToken);
        if (delivery is null) return false;

        var line = delivery.Lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null) return false;

        delivery.RemoveLine(line);
        await UpdateAsync(delivery, cancellationToken);
        return true;
    }

    public async Task<DeliveryDto?> ShipAsync(long id, CancellationToken cancellationToken = default)
    {
        var delivery = await LoadAggregateAsync(id, cancellationToken);
        if (delivery is null) return null;
        delivery.Ship();
        await UpdateAsync(delivery, cancellationToken);
        _logger.LogInformation("BL expédié Id={Id}", id);
        return ToDto(delivery);
    }

    public async Task<DeliveryDto?> MarkDeliveredAsync(long id, CancellationToken cancellationToken = default)
    {
        var delivery = await LoadAggregateAsync(id, cancellationToken);
        if (delivery is null) return null;
        delivery.MarkDelivered();
        await UpdateAsync(delivery, cancellationToken);
        _logger.LogInformation("BL marqué livré Id={Id}", id);
        return ToDto(delivery);
    }

    public async Task<DeliveryDto?> CancelAsync(long id, CancellationToken cancellationToken = default)
    {
        var delivery = await LoadAggregateAsync(id, cancellationToken);
        if (delivery is null) return null;
        delivery.Cancel();
        await UpdateAsync(delivery, cancellationToken);
        _logger.LogInformation("BL annulé Id={Id}", id);
        return ToDto(delivery);
    }

    private async Task<Delivery?> LoadAggregateAsync(long id, CancellationToken ct)
        => await DbSet
            .Include(d => d.Invoice)
            .Include(d => d.Lines).ThenInclude(l => l.PurchaseLine)
            .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.Product)
            .Include(d => d.Lines).ThenInclude(l => l.InvoiceLine).ThenInclude(il => il!.DeliveryLines)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

    private static DeliveryDto ToDto(Delivery d) => new(
        d.Id, d.Reference, d.DeliveryDate,
        d.InvoiceId, d.Invoice?.Reference,
        d.Status.ToString(),
        d.DeliveryAddress, d.RecipientName, d.CarrierName, d.TrackingNumber, d.Notes,
        d.Lines.Select(ToLineDto).ToList(),
        d.CreatedAt, d.UpdatedAt);

    private static DeliveryLineDto ToLineDto(DeliveryLine l) => new(
        l.Id, l.DeliveryId, l.InvoiceLineId, l.PurchaseLineId,
        l.PurchaseLine?.LotNumber,
        l.InvoiceLine?.ProductId,
        l.InvoiceLine?.Product?.Designation,
        l.QuantityDelivered);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
