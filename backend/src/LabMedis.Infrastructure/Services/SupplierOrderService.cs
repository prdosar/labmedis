using LabMedis.Application.Dtos.SupplierOrders;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class SupplierOrderService : BaseRepository<SupplierOrder>, ISupplierOrderService
{
    private readonly IFileStorageService _fileStorage;

    public SupplierOrderService(AppDbContext dbContext, IFileStorageService fileStorage)
        : base(dbContext)
    {
        _fileStorage = fileStorage;
    }

    // ── Queries ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<SupplierOrderSummaryDto>> GetAllAsync(
        int page, int size, string? status, long? supplierId, CancellationToken ct = default)
    {
        var q = DbSet
            .Include(o => o.Supplier)
            .Include(o => o.Lines)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SupplierOrderStatus>(status, true, out var s))
            q = q.Where(o => o.Status == s);
        if (supplierId.HasValue)
            q = q.Where(o => o.SupplierId == supplierId);

        q = q.OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.Id);

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);

        return new PagedResult<SupplierOrderSummaryDto>(
            items.Select(ToSummaryDto).ToList(),
            total, page, size);
    }

    public async Task<SupplierOrderDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Supplier)
            .Include(o => o.Lines)
                .ThenInclude(l => l.Product)
                    .ThenInclude(p => p!.Packaging)
            .Include(o => o.Lines)
                .ThenInclude(l => l.Product)
                    .ThenInclude(p => p!.Dosage)
            .Include(o => o.Documents)
            .Include(o => o.ProformaRejections)
            .Include(o => o.SupplierInvoice)
                .ThenInclude(i => i!.Supplier)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null) return null;

        return ToDto(order);
    }

    public async Task<IReadOnlyList<SupplierOrderDocumentDto>> GetDocumentsAsync(long orderId, CancellationToken ct = default)
    {
        var docs = await DbContext.SupplierOrderDocuments
            .Where(d => d.SupplierOrderId == orderId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(ct);

        return docs.Select(d => ToDocumentDto(d)).ToList();
    }

    // ── Mutations ────────────────────────────────────────────────────────────────

    public async Task<SupplierOrderDto> CreateAsync(SupplierOrderCreateDto dto, CancellationToken ct = default)
    {
        var supplierExists = await DbContext.Suppliers
            .AnyAsync(s => s.Id == dto.SupplierId, ct);
        if (!supplierExists)
            throw new DomainException($"Fournisseur introuvable (Id={dto.SupplierId}).");

        var order = new SupplierOrder
        {
            SupplierId = dto.SupplierId,
            OrderDate = dto.OrderDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "EUR" : dto.Currency.Trim().ToUpperInvariant(),
            Notes = dto.Notes?.Trim()
        };

        var reference = await NextReferenceAsync(ct);
        order.SetReference(reference);

        DbContext.SupplierOrders.Add(order);

        foreach (var lineInput in dto.Lines)
        {
            if (lineInput.Quantity <= 0)
                throw new DomainException($"La quantité doit être positive (produit Id={lineInput.ProductId}).");

            var productExists = await DbContext.Products
                .AnyAsync(p => p.Id == lineInput.ProductId, ct);
            if (!productExists)
                throw new DomainException($"Produit introuvable (Id={lineInput.ProductId}).");

            var line = new SupplierOrderLine
            {
                ProductId = lineInput.ProductId,
                Quantity = lineInput.Quantity,
                OrderUnit = string.IsNullOrWhiteSpace(lineInput.OrderUnit) ? "Carton" : lineInput.OrderUnit,
                UnitsPerCarton = lineInput.UnitsPerCarton,
                SupplierOrder = order
            };
            DbContext.SupplierOrderLines.Add(line);
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(order.Id, ct) ?? throw new InvalidOperationException("Order not found after creation.");
    }

    public async Task<SupplierOrderDto?> UpdateAsync(long id, SupplierOrderUpdateDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null) return null;

        if (order.Status != SupplierOrderStatus.Brouillon)
            throw new DomainException("Seul un bon de commande en brouillon peut être modifié.");

        var existingLines = order.Lines.ToList();
        DbContext.SupplierOrderLines.RemoveRange(existingLines);
        await DbContext.SaveChangesAsync(ct);

        order.OrderDate = dto.OrderDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        order.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "EUR" : dto.Currency.Trim().ToUpperInvariant();
        order.Notes = dto.Notes?.Trim();

        foreach (var lineInput in dto.Lines)
        {
            if (lineInput.Quantity <= 0)
                throw new DomainException($"La quantité doit être positive (produit Id={lineInput.ProductId}).");

            var productExists = await DbContext.Products
                .AnyAsync(p => p.Id == lineInput.ProductId, ct);
            if (!productExists)
                throw new DomainException($"Produit introuvable (Id={lineInput.ProductId}).");

            var line = new SupplierOrderLine
            {
                SupplierOrderId = order.Id,
                ProductId = lineInput.ProductId,
                Quantity = lineInput.Quantity,
                OrderUnit = string.IsNullOrWhiteSpace(lineInput.OrderUnit) ? "Carton" : lineInput.OrderUnit,
                UnitsPerCarton = lineInput.UnitsPerCarton
            };
            DbContext.SupplierOrderLines.Add(line);
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<SupplierOrderDto> MarkSentAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.MarkSent();
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDto> CancelAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.Cancel();
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDto> ReceiveProformaAsync(long id, ReceiveProformaDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.MarkProformaReceived(
            dto.ProformaReference?.Trim(),
            dto.ContainerReference?.Trim(),
            dto.FreightAmount,
            dto.PaymentTerms?.Trim(),
            dto.Brand?.Trim(),
            dto.Origin?.Trim(),
            dto.ExpectedShippingDate);

        // Update unit FOB prices per line
        foreach (var lineInput in dto.Lines)
        {
            var line = order.Lines.FirstOrDefault(l => l.Id == lineInput.LineId);
            if (line is not null)
                line.UnitFobPrice = lineInput.UnitFobPrice;
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDto> ValidateProformaAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.ProformaRejections)
            .Include(o => o.SupplierInvoice)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.ValidateProforma();
        await DbContext.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDto> RejectProformaAsync(long id, RejectProformaDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.ProformaRejections)
            .Include(o => o.SupplierInvoice)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.RejectProforma(dto.Reason);
        await DbContext.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDto> ReceiveInvoiceAsync(long id, ReceiveSupplierInvoiceDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.ProformaRejections)
            .Include(o => o.SupplierInvoice)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        if (order.SupplierInvoice is not null)
            throw new DomainException("Une facture fournisseur a déjà été enregistrée pour cette commande.");

        order.MarkInvoiceReceived();

        var invoice = new SupplierInvoice
        {
            SupplierOrderId = order.Id,
            SupplierId = order.SupplierId,
            InvoiceReference = dto.InvoiceReference.Trim(),
            InvoiceDate = dto.InvoiceDate,
            DueDate = dto.DueDate,
            TotalAmountForeign = dto.TotalAmountForeign,
            Currency = dto.Currency.Trim().ToUpperInvariant(),
            ExchangeRateToXof = dto.ExchangeRateToXof,
            Notes = dto.Notes?.Trim()
        };
        invoice.ComputeXof();

        DbContext.SupplierInvoices.Add(invoice);
        await DbContext.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierInvoiceDto> RegisterPaymentAsync(long invoiceId, RegisterSupplierPaymentDto dto, CancellationToken ct = default)
    {
        var invoice = await DbContext.SupplierInvoices
            .Include(i => i.Supplier)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw new DomainException($"Facture fournisseur introuvable (Id={invoiceId}).");

        invoice.RegisterPayment(dto.Amount);
        await DbContext.SaveChangesAsync(ct);
        return ToInvoiceDto(invoice);
    }

    public async Task<SupplierOrderDto> ReceiveGoodsAsync(long id, ReceiveGoodsDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Supplier)
            .Include(o => o.Lines)
                .ThenInclude(l => l.Product)
            .Include(o => o.ProformaRejections)
            .Include(o => o.SupplierInvoice)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.MarkGoodsReceived();

        // Générer la référence d'arrivage
        var year = DateTime.UtcNow.Year;
        var arrivalPrefix = $"ARR-{year}-";
        var existingRefs = await DbContext.Purchases
            .IgnoreQueryFilters()
            .Where(p => p.Reference.StartsWith(arrivalPrefix))
            .Select(p => p.Reference)
            .ToListAsync(ct);
        var maxSeq = existingRefs
            .Select(r => { var parts = r.Split('-'); return parts.Length == 3 && int.TryParse(parts[2], out var n) ? n : 0; })
            .DefaultIfEmpty(0).Max();
        var arrivalRef = $"{arrivalPrefix}{(maxSeq + 1):D3}";

        var purchase = new Purchase
        {
            Reference = arrivalRef,
            PurchaseDate = dto.ArrivalDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            ArrivalDate = dto.ArrivalDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            SupplierId = order.SupplierId,
            ContainerReference = order.ContainerReference,
            Notes = dto.Notes?.Trim()
        };
        purchase.SetExchangeRate(dto.ExchangeRateToXof);
        purchase.SetCoefficients(
            dto.CommissionCoefficient, dto.FreightCoefficient,
            dto.TransitCoefficient, dto.TransferFeesCoefficient,
            dto.DefaultMarginCoefficient);

        DbContext.Purchases.Add(purchase);
        await DbContext.SaveChangesAsync(ct); // obtenir purchase.Id

        foreach (var lineInput in dto.Lines)
        {
            var orderLine = order.Lines.FirstOrDefault(l => l.Id == lineInput.OrderLineId)
                ?? throw new DomainException($"Ligne de commande introuvable (Id={lineInput.OrderLineId}).");

            var product = await DbContext.Products
                .FirstOrDefaultAsync(p => p.Id == orderLine.ProductId, ct)
                ?? throw new DomainException($"Produit introuvable (Id={orderLine.ProductId}).");

            var purchaseLine = purchase.AddLine(
                product,
                lineInput.LotNumber,
                lineInput.Quantity,
                lineInput.UnitFobPrice,
                lineInput.ExpirationDate,
                lineInput.TargetSellingPriceHt);

            DbContext.PurchaseLines.Add(purchaseLine);
            await DbContext.SaveChangesAsync(ct); // obtenir purchaseLine.Id

            // Mouvement de stock entrant (QuantityRemaining est déjà initialisé dans AddLine)
            DbContext.StockMovements.Add(new StockMovement
            {
                ProductId = product.Id,
                WarehouseId = product.WarehouseId,
                PurchaseLineId = purchaseLine.Id,
                MovementType = StockMovementType.PurchaseEntry,
                Quantity = lineInput.Quantity,
                MovementDate = DateTime.UtcNow,
                Reference = arrivalRef
            });
        }

        await DbContext.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierOrderDocumentDto> UploadDocumentAsync(
        long orderId, Stream content, string originalFileName, long fileSize, string documentType, CancellationToken ct = default)
    {
        var orderExists = await DbSet.AnyAsync(o => o.Id == orderId, ct);
        if (!orderExists)
            throw new DomainException($"Bon de commande introuvable (Id={orderId}).");

        var (relativePath, _) = await _fileStorage.SaveAsync(content, $"supplier-orders/{orderId}", originalFileName, ct);

        var doc = new SupplierOrderDocument
        {
            SupplierOrderId = orderId,
            DocumentType = documentType,
            FileName = originalFileName,
            FilePath = relativePath,
            FileSize = fileSize
        };
        DbContext.SupplierOrderDocuments.Add(doc);
        await DbContext.SaveChangesAsync(ct);

        return ToDocumentDto(doc);
    }

    public async Task DeleteDocumentAsync(long documentId, CancellationToken ct = default)
    {
        var doc = await DbContext.SupplierOrderDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId, ct)
            ?? throw new DomainException($"Document introuvable (Id={documentId}).");

        await _fileStorage.DeleteAsync(doc.FilePath, ct);
        DbContext.SupplierOrderDocuments.Remove(doc);
        await DbContext.SaveChangesAsync(ct);
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private async Task<string> NextReferenceAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"BC-{year}-";
        var existing = await DbSet.IgnoreQueryFilters()
            .Where(o => o.Reference.StartsWith(prefix))
            .Select(o => o.Reference)
            .ToListAsync(ct);

        var max = existing
            .Select(r =>
            {
                var parts = r.Split('-');
                return parts.Length == 3 && int.TryParse(parts[2], out var n) ? n : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}{(max + 1):D3}";
    }

    // ── DTO mappers ──────────────────────────────────────────────────────────────

    private static SupplierOrderSummaryDto ToSummaryDto(SupplierOrder o) => new(
        o.Id,
        o.Reference,
        o.OrderDate,
        o.SupplierId,
        o.Supplier?.Name ?? "",
        o.Status.ToString(),
        o.Currency,
        o.Lines.Count,
        o.Notes,
        o.CreatedAt,
        o.UpdatedAt);

    private SupplierOrderDto ToDto(SupplierOrder o) => new(
        o.Id,
        o.Reference,
        o.OrderDate,
        o.SupplierId,
        o.Supplier?.Name ?? "",
        o.Status.ToString(),
        o.Currency,
        o.Notes,
        o.ProformaReference,
        o.ProformaFilePath,
        o.ProformaReceivedAt,
        o.ContainerReference,
        o.FreightAmount,
        o.PaymentTerms,
        o.Brand,
        o.Origin,
        o.ExpectedShippingDate,
        o.Lines.Select(ToLineDto).ToList(),
        o.Documents.Select(ToDocumentDto).ToList(),
        o.ProformaRejections.Select(ToRejectionDto).ToList(),
        o.SupplierInvoice is null ? null : ToInvoiceDto(o.SupplierInvoice),
        o.CreatedAt,
        o.UpdatedAt);

    private static SupplierProformaRejectionDto ToRejectionDto(SupplierProformaRejection r) => new(
        r.Id,
        r.ProformaReference,
        r.RejectedAt,
        r.Reason);

    private static SupplierInvoiceDto ToInvoiceDto(SupplierInvoice i) => new(
        i.Id,
        i.SupplierOrderId,
        i.SupplierId,
        i.Supplier?.Name ?? "",
        i.InvoiceReference,
        i.InvoiceDate,
        i.DueDate,
        i.TotalAmountForeign,
        i.Currency,
        i.ExchangeRateToXof,
        i.TotalAmountXof,
        i.Status.ToString(),
        i.AmountPaid,
        i.BalanceDue,
        i.Notes,
        i.CreatedAt);

    private static SupplierOrderLineDto ToLineDto(SupplierOrderLine l) => new(
        l.Id,
        l.ProductId,
        l.Product?.Code ?? "",
        l.Product?.Designation ?? "",
        l.Product?.Packaging?.Name,
        l.Product?.Dosage?.Name,
        l.Quantity,
        l.OrderUnit,
        l.UnitsPerCarton,
        l.UnitFobPrice);

    private SupplierOrderDocumentDto ToDocumentDto(SupplierOrderDocument d) => new(
        d.Id,
        d.DocumentType,
        d.FileName,
        _fileStorage.GetPublicUrl(d.FilePath),
        d.FileSize,
        d.CreatedAt);
}
