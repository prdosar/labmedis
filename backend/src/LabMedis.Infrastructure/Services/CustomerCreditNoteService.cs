using LabMedis.Application.Dtos.CustomerCreditNotes;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class CustomerCreditNoteService : BaseRepository<CustomerCreditNote>, ICustomerCreditNoteService
{
    private readonly ILogger<CustomerCreditNoteService> _logger;

    public CustomerCreditNoteService(AppDbContext dbContext, ILogger<CustomerCreditNoteService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    // ── Queries ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<CustomerCreditNoteDto>> GetAllAsync(
        int page, int size, string? status, long? customerId, CancellationToken ct = default)
    {
        var q = DbSet
            .Include(c => c.Customer)
            .Include(c => c.Invoice)
            .Include(c => c.Lines).ThenInclude(l => l.Product)
            .Include(c => c.Lines).ThenInclude(l => l.Warehouse)
            .Include(c => c.Lines).ThenInclude(l => l.PurchaseLine)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CustomerCreditNoteStatus>(status, true, out var s))
            q = q.Where(c => c.Status == s);
        if (customerId.HasValue)
            q = q.Where(c => c.CustomerId == customerId);

        q = q.OrderByDescending(c => c.CreditNoteDate).ThenByDescending(c => c.Id);

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);

        return new PagedResult<CustomerCreditNoteDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<CustomerCreditNoteDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var item = await LoadFullAsync(id, ct);
        return item is null ? null : ToDto(item);
    }

    public async Task<IReadOnlyList<CustomerCreditNoteDto>> GetByInvoiceAsync(long invoiceId, CancellationToken ct = default)
    {
        var items = await DbSet
            .Include(c => c.Customer)
            .Include(c => c.Invoice)
            .Include(c => c.Lines).ThenInclude(l => l.Product)
            .Include(c => c.Lines).ThenInclude(l => l.Warehouse)
            .Include(c => c.Lines).ThenInclude(l => l.PurchaseLine)
            .Where(c => c.InvoiceId == invoiceId)
            .OrderByDescending(c => c.CreditNoteDate)
            .ToListAsync(ct);
        return items.Select(ToDto).ToList();
    }

    // ── Commands ─────────────────────────────────────────────────────────────────

    public async Task<CustomerCreditNoteDto> CreateAsync(CreateCustomerCreditNoteDto dto, CancellationToken ct = default)
    {
        if (dto.Lines is null || dto.Lines.Count == 0)
            throw new DomainException("Un avoir client doit comporter au moins une ligne.");

        if (!await DbContext.Customers.AnyAsync(c => c.Id == dto.CustomerId, ct))
            throw new DomainException($"Client introuvable (Id={dto.CustomerId}).");

        if (dto.InvoiceId.HasValue && !await DbContext.Invoices.AnyAsync(i => i.Id == dto.InvoiceId, ct))
            throw new DomainException($"Facture introuvable (Id={dto.InvoiceId}).");

        var reference = await NextReferenceAsync(ct);

        var creditNote = new CustomerCreditNote
        {
            Reference = reference,
            CustomerId = dto.CustomerId,
            InvoiceId = dto.InvoiceId,
            CreditNoteDate = dto.CreditNoteDate == default ? DateOnly.FromDateTime(DateTime.UtcNow) : dto.CreditNoteDate,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
        };

        await CreateAsync(creditNote, ct);

        foreach (var lineDto in dto.Lines)
        {
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
            }

            var line = new CustomerCreditNoteLine
            {
                CustomerCreditNoteId = creditNote.Id,
                ProductId = lineDto.ProductId,
                WarehouseId = lineDto.WarehouseId,
                PurchaseLineId = lineDto.PurchaseLineId,
                QuantityReturned = lineDto.QuantityReturned,
                UnitPriceHt = lineDto.UnitPriceHt,
                DiscountPercent = lineDto.DiscountPercent,
                TvaRate = lineDto.TvaRate,
                LotNumber = string.IsNullOrWhiteSpace(lineDto.LotNumber) ? null : lineDto.LotNumber.Trim(),
            };
            line.ComputeAmounts();

            // Réinjecter le stock sur le lot d'origine
            if (purchaseLine is not null)
            {
                purchaseLine.ReleaseStock(lineDto.QuantityReturned);
                DbContext.PurchaseLines.Update(purchaseLine);
            }

            // Create stock return movement
            var movement = new StockMovement
            {
                ProductId = lineDto.ProductId,
                WarehouseId = lineDto.WarehouseId,
                PurchaseLineId = lineDto.PurchaseLineId,
                MovementType = StockMovementType.Return,
                Quantity = lineDto.QuantityReturned,
                MovementDate = creditNote.CreditNoteDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                Reference = reference,
                Notes = $"Retour client — avoir {reference}",
            };
            DbContext.StockMovements.Add(movement);
            await DbContext.SaveChangesAsync(ct);

            line.StockMovementId = movement.Id;
            // Ne PAS faire DbContext.CustomerCreditNoteLines.Add(line) ici :
            // AddLine() ajoute la ligne à _lines et EF la persistera via la navigation
            // au SaveChanges suivant. L'ajout explicite provoquait la fixup EF à
            // insérer la ligne dans _lines une seconde fois → totaux doublés.
            creditNote.AddLine(line);
        }

        await UpdateAsync(creditNote, ct);

        _logger.LogInformation("Avoir client créé Id={Id} Reference={Reference} Client={CustomerId}", creditNote.Id, creditNote.Reference, creditNote.CustomerId);
        return await GetByIdAsync(creditNote.Id, ct) ?? ToDto(creditNote);
    }

    public async Task<CustomerCreditNoteDto> UpdateStatusAsync(long id, UpdateCustomerCreditNoteStatusDto dto, CancellationToken ct = default)
    {
        var creditNote = await LoadFullAsync(id, ct)
            ?? throw new DomainException($"Avoir client introuvable (Id={id}).");

        if (!Enum.TryParse<CustomerCreditNoteStatus>(dto.Status, true, out var newStatus))
            throw new DomainException($"Statut invalide : '{dto.Status}'.");

        creditNote.UpdateStatus(newStatus, dto.Notes);
        await UpdateAsync(creditNote, ct);
        return ToDto(creditNote);
    }

    public async Task<CustomerCreditNoteDto> ApplyToInvoiceAsync(long id, CancellationToken ct = default)
    {
        var creditNote = await LoadFullAsync(id, ct)
            ?? throw new DomainException($"Avoir client introuvable (Id={id}).");

        if (!creditNote.InvoiceId.HasValue)
            throw new DomainException("Cet avoir n'est pas lié à une facture. Veuillez choisir un remboursement direct.");

        if (creditNote.Status != CustomerCreditNoteStatus.EnAttente)
            throw new DomainException("Seul un avoir en attente peut être appliqué à une facture.");

        var invoice = await DbContext.Invoices.FirstOrDefaultAsync(i => i.Id == creditNote.InvoiceId, ct)
            ?? throw new DomainException("Facture liée introuvable.");

        if (creditNote.TotalAmountTtc > invoice.BalanceDue + 0.01m)
            throw new DomainException($"Le montant de l'avoir ({creditNote.TotalAmountTtc:0.##} XOF) dépasse le solde de la facture ({invoice.BalanceDue:0.##} XOF). Optez pour un remboursement direct.");

        invoice.RegisterPayment(creditNote.TotalAmountTtc);
        DbContext.Invoices.Update(invoice);

        var payment = new InvoicePayment
        {
            InvoiceId = invoice.Id,
            Amount = creditNote.TotalAmountTtc,
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            PaymentMethod = "Avoir client",
            Reference = creditNote.Reference,
            Notes = $"Application de l'avoir client {creditNote.Reference}",
        };
        DbContext.InvoicePayments.Add(payment);

        creditNote.UpdateStatus(CustomerCreditNoteStatus.DéduitDeFacture);
        await UpdateAsync(creditNote, ct);

        _logger.LogInformation("Avoir client {Reference} déduit de la facture Id={InvoiceId}", creditNote.Reference, invoice.Id);
        return ToDto(creditNote);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private async Task<CustomerCreditNote?> LoadFullAsync(long id, CancellationToken ct)
        => await DbSet
            .Include(c => c.Customer)
            .Include(c => c.Invoice)
            .Include(c => c.Lines).ThenInclude(l => l.Product)
            .Include(c => c.Lines).ThenInclude(l => l.Warehouse)
            .Include(c => c.Lines).ThenInclude(l => l.PurchaseLine)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

    private async Task<string> NextReferenceAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"AVOIR-CLI-{year}-";
        var count = await DbSet.CountAsync(c => c.Reference.StartsWith(prefix), ct);
        return $"{prefix}{count + 1:D3}";
    }

    private static CustomerCreditNoteDto ToDto(CustomerCreditNote c) => new(
        c.Id,
        c.Reference,
        c.CustomerId, c.Customer?.Name ?? string.Empty,
        c.InvoiceId, c.Invoice?.Reference,
        c.CreditNoteDate,
        c.TotalAmountHt, c.TotalTva, c.TotalAmountTtc,
        c.Status.ToString(),
        c.Notes,
        c.ResolvedAt,
        c.CreatedAt,
        c.Lines.Select(l => new CustomerCreditNoteLineDto(
            l.Id,
            l.ProductId, l.Product?.Code, l.Product?.Designation,
            l.WarehouseId, l.Warehouse?.Name,
            l.PurchaseLineId, l.LotNumber ?? l.PurchaseLine?.LotNumber,
            l.QuantityReturned,
            l.UnitPriceHt, l.DiscountPercent, l.TvaRate,
            l.LineTotalHt, l.LineTva, l.LineTotalTtc,
            l.StockMovementId
        )).ToList()
    );
}
