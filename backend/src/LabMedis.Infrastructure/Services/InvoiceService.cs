using LabMedis.Application.Dtos.Invoices;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class InvoiceService : BaseRepository<Invoice>, IInvoiceService
{
    private readonly ILogger<InvoiceService> _logger;
    private readonly IAccountingService _accounting;

    public InvoiceService(AppDbContext dbContext, ILogger<InvoiceService> logger, IAccountingService accounting) : base(dbContext)
    {
        _logger = logger;
        _accounting = accounting;
    }

    public async Task<PagedResult<InvoiceDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
        var items = await DbSet
            .Include(i => i.Customer)
            .Include(i => i.Lines).ThenInclude(l => l.Product)
            .Include(i => i.Lines).ThenInclude(l => l.DeliveryLines)
            .OrderByDescending(i => i.InvoiceDate)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<InvoiceDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<InvoiceDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await LoadAggregateAsync(id, cancellationToken);
        return item is null ? null : ToDto(item);
    }

    public async Task<InvoiceDto> CreateAsync(InvoiceCreateDto dto, CancellationToken cancellationToken = default)
    {
        var reference = dto.Reference.Trim();
        if (await DbSet.AnyAsync(i => i.Reference == reference, cancellationToken))
            throw new DomainException($"Une facture avec la référence '{reference}' existe déjà.");

        if (!await DbContext.Customers.AnyAsync(c => c.Id == dto.CustomerId, cancellationToken))
            throw new DomainException($"Client introuvable (Id={dto.CustomerId}).");

        var entity = new Invoice
        {
            Reference = reference,
            InvoiceDate = dto.InvoiceDate,
            DueDate = dto.DueDate,
            CustomerId = dto.CustomerId,
            Notes = Trim(dto.Notes)
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Facture créée Id={Id} Reference={Reference}", entity.Id, entity.Reference);
        return ToDto(entity);
    }

    public async Task<InvoiceDto?> UpdateAsync(long id, InvoiceUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await LoadAggregateAsync(id, cancellationToken);
        if (entity is null) return null;

        var reference = dto.Reference.Trim();
        if (!string.Equals(entity.Reference, reference, StringComparison.Ordinal)
            && await DbSet.AnyAsync(i => i.Id != id && i.Reference == reference, cancellationToken))
            throw new DomainException($"Une autre facture utilise déjà la référence '{reference}'.");

        entity.Reference = reference;
        entity.InvoiceDate = dto.InvoiceDate;
        entity.DueDate = dto.DueDate;
        entity.Notes = Trim(dto.Notes);

        await UpdateAsync(entity, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await LoadAggregateAsync(id, cancellationToken);
        if (entity is null) return false;

        if (entity.Status != Domain.Enums.InvoiceStatus.Draft)
            throw new DomainException("Seule une facture en brouillon peut être supprimée.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public async Task<InvoiceLineDto> AddLineAsync(long invoiceId, InvoiceLineCreateDto dto, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(invoiceId, cancellationToken)
            ?? throw new DomainException($"Facture introuvable (Id={invoiceId}).");

        var product = await DbContext.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId, cancellationToken)
            ?? throw new DomainException($"Produit introuvable (Id={dto.ProductId}).");

        var line = invoice.AddLine(product, dto.Quantity, dto.UnitPriceHt, dto.DiscountPercent, dto.TvaRate);
        await UpdateAsync(invoice, cancellationToken);
        _logger.LogInformation("Ligne ajoutée à la facture Id={InvoiceId}", invoiceId);
        return ToLineDto(line);
    }

    public async Task<InvoiceLineDto?> UpdateLineAsync(long invoiceId, long lineId, InvoiceLineUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(invoiceId, cancellationToken)
            ?? throw new DomainException($"Facture introuvable (Id={invoiceId}).");

        var line = invoice.Lines.FirstOrDefault(l => l.Id == lineId)
            ?? throw new DomainException($"Ligne introuvable (Id={lineId}) dans cette facture.");

        line.ChangeQuantity(dto.Quantity);
        line.ChangeUnitPrice(dto.UnitPriceHt);
        line.ChangeDiscount(dto.DiscountPercent);
        line.ChangeTvaRate(dto.TvaRate);

        await UpdateAsync(invoice, cancellationToken);
        return ToLineDto(line);
    }

    public async Task<bool> RemoveLineAsync(long invoiceId, long lineId, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(invoiceId, cancellationToken);
        if (invoice is null) return false;

        var line = invoice.Lines.FirstOrDefault(l => l.Id == lineId);
        if (line is null) return false;

        invoice.RemoveLine(line);
        await UpdateAsync(invoice, cancellationToken);
        return true;
    }

    public async Task<InvoiceDto?> IssueAsync(long id, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(id, cancellationToken);
        if (invoice is null) return null;
        invoice.Issue();
        await UpdateAsync(invoice, cancellationToken);

        // Post accounting entry (JV – Journal des Ventes)
        var acc4111 = await _accounting.RequireAccountAsync("4111", cancellationToken);
        var acc701  = await _accounting.RequireAccountAsync("701",  cancellationToken);
        var acc4431 = await _accounting.RequireAccountAsync("4431", cancellationToken);

        var entry = new JournalEntry
        {
            JournalCode = "JV",
            EntryDate   = invoice.InvoiceDate,
            Reference   = invoice.Reference,
            Description = $"Facture client {invoice.Customer?.Name}",
            SourceType  = "InvoiceIssued",
            SourceId    = invoice.Id,
            IsPosted    = false
        };
        entry.AddLine(new JournalLine { AccountId = acc4111.Id, Label = $"Facture {invoice.Reference}", DebitAmount  = invoice.TotalTtc,   CreditAmount = 0,                    CustomerId = invoice.CustomerId });
        entry.AddLine(new JournalLine { AccountId = acc701.Id,  Label = $"Ventes {invoice.Reference}",  DebitAmount  = 0,                  CreditAmount = invoice.SubtotalHt });
        if (invoice.TotalTva > 0)
            entry.AddLine(new JournalLine { AccountId = acc4431.Id, Label = $"TVA {invoice.Reference}", DebitAmount  = 0,                  CreditAmount = invoice.TotalTva });
        entry.Validate();
        await _accounting.PostAsync(entry, cancellationToken);

        _logger.LogInformation("Facture émise Id={Id}", id);
        return ToDto(invoice);
    }

    public async Task<InvoiceDto?> RegisterPaymentAsync(long id, RegisterPaymentDto dto, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(id, cancellationToken);
        if (invoice is null) return null;
        invoice.RegisterPayment(dto.Amount);
        await UpdateAsync(invoice, cancellationToken);

        // Post accounting entry (JT – Journal de Trésorerie)
        var acc521  = await _accounting.RequireAccountAsync("521",  cancellationToken);
        var acc4111 = await _accounting.RequireAccountAsync("4111", cancellationToken);

        var entry = new JournalEntry
        {
            JournalCode = "JT",
            EntryDate   = DateTime.UtcNow.Date,
            Reference   = $"REG-{invoice.Reference}",
            Description = $"Règlement facture {invoice.Reference}",
            SourceType  = "InvoicePayment",
            SourceId    = invoice.Id,
            IsPosted    = false
        };
        entry.AddLine(new JournalLine { AccountId = acc521.Id,  Label = $"Règlement {invoice.Reference}", DebitAmount  = dto.Amount, CreditAmount = 0 });
        entry.AddLine(new JournalLine { AccountId = acc4111.Id, Label = $"Règlement {invoice.Reference}", DebitAmount  = 0,          CreditAmount = dto.Amount, CustomerId = invoice.CustomerId });
        entry.Validate();
        await _accounting.PostAsync(entry, cancellationToken);

        _logger.LogInformation("Règlement enregistré sur facture Id={Id} Montant={Amount}", id, dto.Amount);
        return ToDto(invoice);
    }

    public async Task<InvoiceDto?> CancelAsync(long id, CancellationToken cancellationToken = default)
    {
        var invoice = await LoadAggregateAsync(id, cancellationToken);
        if (invoice is null) return null;
        invoice.Cancel();
        await UpdateAsync(invoice, cancellationToken);

        // Post reversal accounting entry (JOD – Journal des Opérations Diverses)
        var acc701  = await _accounting.RequireAccountAsync("701",  cancellationToken);
        var acc4431 = await _accounting.RequireAccountAsync("4431", cancellationToken);
        var acc4111 = await _accounting.RequireAccountAsync("4111", cancellationToken);

        var entry = new JournalEntry
        {
            JournalCode = "JOD",
            EntryDate   = DateTime.UtcNow.Date,
            Reference   = $"ANN-{invoice.Reference}",
            Description = $"Annulation facture {invoice.Reference}",
            SourceType  = "InvoiceCancelled",
            SourceId    = invoice.Id,
            IsPosted    = false
        };
        entry.AddLine(new JournalLine { AccountId = acc701.Id,  Label = $"Annulation {invoice.Reference}", DebitAmount  = invoice.SubtotalHt, CreditAmount = 0 });
        if (invoice.TotalTva > 0)
            entry.AddLine(new JournalLine { AccountId = acc4431.Id, Label = $"TVA annulée {invoice.Reference}", DebitAmount  = invoice.TotalTva, CreditAmount = 0 });
        entry.AddLine(new JournalLine { AccountId = acc4111.Id, Label = $"Annulation {invoice.Reference}", DebitAmount  = 0, CreditAmount = invoice.TotalTtc, CustomerId = invoice.CustomerId });
        entry.Validate();
        await _accounting.PostAsync(entry, cancellationToken);

        _logger.LogInformation("Facture annulée Id={Id}", id);
        return ToDto(invoice);
    }

    private async Task<Invoice?> LoadAggregateAsync(long id, CancellationToken ct)
        => await DbSet
            .Include(i => i.Customer)
            .Include(i => i.Lines).ThenInclude(l => l.Product)
            .Include(i => i.Lines).ThenInclude(l => l.DeliveryLines)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    private static InvoiceDto ToDto(Invoice i) => new(
        i.Id, i.Reference, i.InvoiceDate, i.DueDate,
        i.CustomerId, i.Customer?.Name,
        i.Status.ToString(),
        i.SubtotalHt, i.TotalTva, i.TotalTtc, i.AmountPaid, i.BalanceDue,
        i.Notes,
        i.Lines.Select(ToLineDto).ToList(),
        i.CreatedAt, i.UpdatedAt);

    private static InvoiceLineDto ToLineDto(InvoiceLine l) => new(
        l.Id, l.InvoiceId, l.ProductId,
        l.Product?.Code, l.Product?.Designation,
        l.Quantity, l.UnitPriceHt, l.DiscountPercent, l.TvaRate,
        l.LineTotalHt, l.LineTva, l.LineTotalTtc,
        l.QuantityDelivered, l.QuantityRemainingToDeliver);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
