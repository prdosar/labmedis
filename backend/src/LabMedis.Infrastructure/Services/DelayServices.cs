using LabMedis.Application.Dtos.Delays;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class DeliveryDelayService : IDeliveryDelayService
{
    private readonly AppDbContext _db;
    public DeliveryDelayService(AppDbContext db) { _db = db; }

    public async Task<IReadOnlyList<DelayDto>> GetAllAsync(CancellationToken ct = default)
    {
        var items = await _db.DeliveryDelays.OrderBy(x => x.SortOrder).ThenBy(x => x.Label).ToListAsync(ct);
        return items.Select(x => new DelayDto(x.Id, x.Label, x.SortOrder, x.IsActive)).ToList();
    }

    public async Task<DelayDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var x = await _db.DeliveryDelays.FirstOrDefaultAsync(d => d.Id == id, ct);
        return x is null ? null : new DelayDto(x.Id, x.Label, x.SortOrder, x.IsActive);
    }

    public async Task<DelayDto> CreateAsync(DelayCreateDto dto, CancellationToken ct = default)
    {
        var label = dto.Label.Trim();
        if (string.IsNullOrEmpty(label))
            throw new DomainException("Le libellé est obligatoire.");
        if (await _db.DeliveryDelays.AnyAsync(x => x.Label == label, ct))
            throw new DomainException($"Un délai de livraison '{label}' existe déjà.");

        var entity = new DeliveryDelay { Label = label, SortOrder = dto.SortOrder, IsActive = dto.IsActive };
        _db.DeliveryDelays.Add(entity);
        await _db.SaveChangesAsync(ct);
        return new DelayDto(entity.Id, entity.Label, entity.SortOrder, entity.IsActive);
    }

    public async Task<DelayDto?> UpdateAsync(long id, DelayUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.DeliveryDelays.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return null;
        var label = dto.Label.Trim();
        if (!string.Equals(entity.Label, label, StringComparison.Ordinal) &&
            await _db.DeliveryDelays.AnyAsync(x => x.Id != id && x.Label == label, ct))
            throw new DomainException($"Un autre délai utilise déjà le libellé '{label}'.");
        entity.Label = label;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(ct);
        return new DelayDto(entity.Id, entity.Label, entity.SortOrder, entity.IsActive);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
    {
        var entity = await _db.DeliveryDelays.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return false;
        if (await _db.CustomerOrders.AnyAsync(o => o.DeliveryDelayId == id, ct))
            throw new DomainException("Ce délai est utilisé par des commandes, impossible de le supprimer.");
        _db.DeliveryDelays.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

public class PaymentDelayService : IPaymentDelayService
{
    private readonly AppDbContext _db;
    public PaymentDelayService(AppDbContext db) { _db = db; }

    public async Task<IReadOnlyList<DelayDto>> GetAllAsync(CancellationToken ct = default)
    {
        var items = await _db.PaymentDelays.OrderBy(x => x.SortOrder).ThenBy(x => x.Label).ToListAsync(ct);
        return items.Select(x => new DelayDto(x.Id, x.Label, x.SortOrder, x.IsActive)).ToList();
    }

    public async Task<DelayDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var x = await _db.PaymentDelays.FirstOrDefaultAsync(d => d.Id == id, ct);
        return x is null ? null : new DelayDto(x.Id, x.Label, x.SortOrder, x.IsActive);
    }

    public async Task<DelayDto> CreateAsync(DelayCreateDto dto, CancellationToken ct = default)
    {
        var label = dto.Label.Trim();
        if (string.IsNullOrEmpty(label))
            throw new DomainException("Le libellé est obligatoire.");
        if (await _db.PaymentDelays.AnyAsync(x => x.Label == label, ct))
            throw new DomainException($"Un délai de paiement '{label}' existe déjà.");

        var entity = new PaymentDelay { Label = label, SortOrder = dto.SortOrder, IsActive = dto.IsActive };
        _db.PaymentDelays.Add(entity);
        await _db.SaveChangesAsync(ct);
        return new DelayDto(entity.Id, entity.Label, entity.SortOrder, entity.IsActive);
    }

    public async Task<DelayDto?> UpdateAsync(long id, DelayUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.PaymentDelays.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return null;
        var label = dto.Label.Trim();
        if (!string.Equals(entity.Label, label, StringComparison.Ordinal) &&
            await _db.PaymentDelays.AnyAsync(x => x.Id != id && x.Label == label, ct))
            throw new DomainException($"Un autre délai utilise déjà le libellé '{label}'.");
        entity.Label = label;
        entity.SortOrder = dto.SortOrder;
        entity.IsActive = dto.IsActive;
        await _db.SaveChangesAsync(ct);
        return new DelayDto(entity.Id, entity.Label, entity.SortOrder, entity.IsActive);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
    {
        var entity = await _db.PaymentDelays.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return false;
        if (await _db.CustomerOrders.AnyAsync(o => o.PaymentDelayId == id, ct))
            throw new DomainException("Ce délai est utilisé par des commandes, impossible de le supprimer.");
        _db.PaymentDelays.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
