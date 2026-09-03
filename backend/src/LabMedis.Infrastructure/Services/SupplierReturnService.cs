using LabMedis.Application.Dtos.SupplierReturns;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class SupplierReturnService : BaseRepository<SupplierReturn>, ISupplierReturnService
{
    private readonly IAccountingService _accounting;
    private readonly ILogger<SupplierReturnService> _logger;

    public SupplierReturnService(
        AppDbContext dbContext,
        IAccountingService accounting,
        ILogger<SupplierReturnService> logger) : base(dbContext)
    {
        _accounting = accounting;
        _logger = logger;
    }

    // ── Queries ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<SupplierReturnDto>> GetAllAsync(
        int page, int size, long? supplierId, CancellationToken ct = default)
    {
        var q = DbSet
            .Include(r => r.Supplier)
            .Include(r => r.Purchase)
            .Include(r => r.SupplierCreditNote)
            .Include(r => r.Lines).ThenInclude(l => l.Product)
            .Include(r => r.Lines).ThenInclude(l => l.Warehouse)
            .Include(r => r.Lines).ThenInclude(l => l.PurchaseLine)
            .AsQueryable();

        if (supplierId.HasValue)
            q = q.Where(r => r.SupplierId == supplierId.Value);

        q = q.OrderByDescending(r => r.ReturnDate).ThenByDescending(r => r.Id);

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return new PagedResult<SupplierReturnDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<SupplierReturnDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var item = await LoadFullAsync(id, ct);
        return item is null ? null : ToDto(item);
    }

    // ── Commands ─────────────────────────────────────────────────────────────────

    public async Task<SupplierReturnDto> CreateAsync(CreateSupplierReturnDto dto, CancellationToken ct = default)
    {
        if (dto.Lines is null || dto.Lines.Count == 0)
            throw new DomainException("Un retour fournisseur doit comporter au moins une ligne.");

        if (!await DbContext.Suppliers.AnyAsync(s => s.Id == dto.SupplierId, ct))
            throw new DomainException($"Fournisseur introuvable (Id={dto.SupplierId}).");

        if (dto.PurchaseId.HasValue && !await DbContext.Purchases.AnyAsync(p => p.Id == dto.PurchaseId, ct))
            throw new DomainException($"Arrivage introuvable (Id={dto.PurchaseId}).");

        if (dto.ExchangeRateToXof <= 0)
            throw new DomainException("Le taux de change doit être positif.");

        var reference = await NextReferenceAsync(ct);

        var supplierReturn = new SupplierReturn
        {
            Reference = reference,
            SupplierId = dto.SupplierId,
            PurchaseId = dto.PurchaseId,
            ReturnDate = dto.ReturnDate == default ? DateOnly.FromDateTime(DateTime.UtcNow) : dto.ReturnDate,
            Currency = dto.Currency,
            ExchangeRateToXof = dto.ExchangeRateToXof,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
        };

        await CreateAsync(supplierReturn, ct);

        foreach (var lineDto in dto.Lines)
        {
            if (lineDto.QuantityReturned <= 0)
                throw new DomainException("La quantité retournée doit être strictement positive.");

            if (!await DbContext.Products.AnyAsync(p => p.Id == lineDto.ProductId, ct))
                throw new DomainException($"Produit introuvable (Id={lineDto.ProductId}).");

            if (!await DbContext.Warehouses.AnyAsync(w => w.Id == lineDto.WarehouseId, ct))
                throw new DomainException($"Magasin introuvable (Id={lineDto.WarehouseId}).");

            PurchaseLine? purchaseLine = null;
            if (lineDto.PurchaseLineId.HasValue)
            {
                purchaseLine = await DbContext.PurchaseLines
                    .FirstOrDefaultAsync(pl => pl.Id == lineDto.PurchaseLineId, ct)
                    ?? throw new DomainException($"Ligne d'arrivage introuvable (Id={lineDto.PurchaseLineId}).");

                if (purchaseLine.ProductId != lineDto.ProductId)
                    throw new DomainException("La ligne d'arrivage ne correspond pas au produit sélectionné.");

                if (purchaseLine.QuantityRemaining < lineDto.QuantityReturned)
                    throw new DomainException(
                        $"Stock insuffisant sur le lot : disponible={purchaseLine.QuantityRemaining}, demandé={lineDto.QuantityReturned}.");

                purchaseLine.ConsumeStock(lineDto.QuantityReturned);
                DbContext.PurchaseLines.Update(purchaseLine);
            }

            var movement = new StockMovement
            {
                ProductId = lineDto.ProductId,
                WarehouseId = lineDto.WarehouseId,
                PurchaseLineId = lineDto.PurchaseLineId,
                MovementType = StockMovementType.SupplierReturn,
                Quantity = lineDto.QuantityReturned,
                MovementDate = supplierReturn.ReturnDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                Reference = reference,
                Reason = dto.Reason,
                Notes = $"Retour fournisseur — {reference}",
            };
            DbContext.StockMovements.Add(movement);
            await DbContext.SaveChangesAsync(ct);

            var line = new SupplierReturnLine
            {
                SupplierReturnId = supplierReturn.Id,
                ProductId = lineDto.ProductId,
                PurchaseLineId = lineDto.PurchaseLineId,
                WarehouseId = lineDto.WarehouseId,
                QuantityReturned = lineDto.QuantityReturned,
                LotNumber = string.IsNullOrWhiteSpace(lineDto.LotNumber)
                    ? purchaseLine?.LotNumber
                    : lineDto.LotNumber.Trim(),
                UnitCostForeign = lineDto.UnitCostForeign,
                UnitCostXof = lineDto.UnitCostXof,
                StockMovementId = movement.Id,
            };
            line.ComputeAmounts();

            DbContext.SupplierReturnLines.Add(line);
            supplierReturn.AddLine(line);
        }

        await UpdateAsync(supplierReturn, ct);

        if (dto.CreateCreditNote)
        {
            var creditNote = await CreateLinkedCreditNoteAsync(supplierReturn, ct);
            supplierReturn.SupplierCreditNoteId = creditNote.Id;
            await UpdateAsync(supplierReturn, ct);

            await PostCreditNoteJournalEntryAsync(supplierReturn, creditNote, ct);
        }

        _logger.LogInformation(
            "Retour fournisseur créé Id={Id} Reference={Reference} Fournisseur={SupplierId} Avoir={HasCreditNote}",
            supplierReturn.Id, supplierReturn.Reference, supplierReturn.SupplierId, dto.CreateCreditNote);

        return await GetByIdAsync(supplierReturn.Id, ct) ?? ToDto(supplierReturn);
    }

    public async Task<SupplierReturnDto> UpdateStatusAsync(long id, UpdateSupplierReturnStatusDto dto, CancellationToken ct = default)
    {
        var supplierReturn = await LoadFullAsync(id, ct)
            ?? throw new DomainException($"Retour fournisseur introuvable (Id={id}).");

        if (!Enum.TryParse<SupplierReturnStatus>(dto.Status, true, out var newStatus))
            throw new DomainException($"Statut invalide : '{dto.Status}'.");

        supplierReturn.UpdateStatus(newStatus);
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            supplierReturn.Notes = (supplierReturn.Notes + "\n" + dto.Notes.Trim()).Trim();

        await UpdateAsync(supplierReturn, ct);
        return ToDto(supplierReturn);
    }

    // ── Privés ───────────────────────────────────────────────────────────────────

    private async Task<SupplierCreditNote> CreateLinkedCreditNoteAsync(SupplierReturn supplierReturn, CancellationToken ct)
    {
        var creditNoteRef = await NextCreditNoteReferenceAsync(ct);

        var creditNote = new SupplierCreditNote
        {
            Reference = creditNoteRef,
            SupplierId = supplierReturn.SupplierId,
            SupplierReturnId = supplierReturn.Id,
            CreditNoteDate = supplierReturn.ReturnDate,
            AmountForeign = supplierReturn.TotalAmountForeign,
            Currency = supplierReturn.Currency,
            ExchangeRateToXof = supplierReturn.ExchangeRateToXof,
            AmountXof = supplierReturn.TotalAmountXof,
            LostBoxesCount = supplierReturn.Lines.Sum(l => l.QuantityReturned),
            Notes = $"Généré automatiquement — retour fournisseur {supplierReturn.Reference}",
        };

        DbContext.SupplierCreditNotes.Add(creditNote);
        await DbContext.SaveChangesAsync(ct);
        return creditNote;
    }

    private async Task PostCreditNoteJournalEntryAsync(
        SupplierReturn supplierReturn, SupplierCreditNote creditNote, CancellationToken ct)
    {
        var amount = Math.Round(supplierReturn.TotalAmountXof, 2);
        if (amount <= 0) return;

        // SYSCOHADA : Dr 4011 Fournisseurs / Cr 601 Achats de marchandises
        ChartAccount acc4011, acc601;
        try
        {
            acc4011 = await _accounting.RequireAccountAsync("4011", ct);
            acc601 = await _accounting.RequireAccountAsync("601", ct);
        }
        catch
        {
            return; // plan comptable incomplet, pas d'écriture auto
        }

        var entry = new JournalEntry
        {
            JournalCode = "JOD",
            EntryDate = supplierReturn.ReturnDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            Reference = creditNote.Reference,
            Description = $"Avoir fournisseur — retour {supplierReturn.Reference}",
            SourceType = "SupplierReturn",
            SourceId = supplierReturn.Id,
            IsPosted = false,
        };

        entry.AddLine(new JournalLine
        {
            AccountId = acc4011.Id,
            SupplierId = supplierReturn.SupplierId,
            Label = $"Retour {supplierReturn.Reference}",
            DebitAmount = amount,
            CreditAmount = 0,
        });
        entry.AddLine(new JournalLine
        {
            AccountId = acc601.Id,
            Label = $"Retour {supplierReturn.Reference}",
            DebitAmount = 0,
            CreditAmount = amount,
        });

        entry.Validate();
        await _accounting.PostAsync(entry, ct);
    }

    private async Task<SupplierReturn?> LoadFullAsync(long id, CancellationToken ct)
        => await DbSet
            .Include(r => r.Supplier)
            .Include(r => r.Purchase)
            .Include(r => r.SupplierCreditNote)
            .Include(r => r.Lines).ThenInclude(l => l.Product)
            .Include(r => r.Lines).ThenInclude(l => l.Warehouse)
            .Include(r => r.Lines).ThenInclude(l => l.PurchaseLine)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    private async Task<string> NextReferenceAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"RETOUR-FOURN-{year}-";
        var count = await DbSet.IgnoreQueryFilters()
            .CountAsync(r => r.Reference.StartsWith(prefix), ct);
        return $"{prefix}{count + 1:D3}";
    }

    private async Task<string> NextCreditNoteReferenceAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"AVOIR-{year}-";
        var existing = await DbContext.SupplierCreditNotes
            .IgnoreQueryFilters()
            .Where(c => c.Reference.StartsWith(prefix))
            .Select(c => c.Reference)
            .ToListAsync(ct);
        var max = existing
            .Select(r => int.TryParse(r[prefix.Length..], out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();
        return $"{prefix}{max + 1:D3}";
    }

    private static SupplierReturnDto ToDto(SupplierReturn r) => new(
        r.Id,
        r.Reference,
        r.SupplierId, r.Supplier?.Name ?? string.Empty,
        r.PurchaseId, r.Purchase?.Reference,
        r.ReturnDate,
        r.Currency,
        r.ExchangeRateToXof,
        r.TotalAmountForeign,
        r.TotalAmountXof,
        r.Reason,
        r.Notes,
        r.Status.ToString(),
        r.SupplierCreditNoteId, r.SupplierCreditNote?.Reference,
        r.CreatedAt,
        r.Lines.Select(l => new SupplierReturnLineDto(
            l.Id,
            l.ProductId, l.Product?.Code, l.Product?.Designation,
            l.PurchaseLineId, l.LotNumber ?? l.PurchaseLine?.LotNumber,
            l.WarehouseId, l.Warehouse?.Name,
            l.QuantityReturned,
            l.UnitCostForeign,
            l.UnitCostXof,
            l.LineTotalForeign,
            l.LineTotalXof,
            l.StockMovementId
        )).ToList()
    );
}
