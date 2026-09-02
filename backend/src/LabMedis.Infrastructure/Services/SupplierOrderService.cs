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
    private readonly IEmailService _emailService;

    public SupplierOrderService(AppDbContext dbContext, IFileStorageService fileStorage, IEmailService emailService)
        : base(dbContext)
    {
        _fileStorage = fileStorage;
        _emailService = emailService;
    }

    // ── Queries ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<SupplierOrderSummaryDto>> GetAllAsync(
        int page, int size, string? status, long? supplierId, CancellationToken ct = default)
    {
        var q = DbSet
            .Include(o => o.Supplier)
            .Include(o => o.Lines)
            .Include(o => o.SupplierInvoice)
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
                .ThenInclude(s => s!.Country)
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

    public async Task<IReadOnlyList<PurchaseSummaryDto>> GetReceptionsAsync(long orderId, CancellationToken ct = default)
    {
        var purchases = await DbContext.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Lines)
            .Include(p => p.Charges)
            .Where(p => p.SupplierOrderId == orderId)
            .OrderByDescending(p => p.ArrivalDate)
            .ToListAsync(ct);

        return purchases.Select(ToPurchaseSummaryDto).ToList();
    }

    public async Task<IReadOnlyList<PurchaseChargeDto>> GetPurchaseChargesAsync(long purchaseId, CancellationToken ct = default)
    {
        var charges = await DbContext.PurchaseCharges
            .Where(c => c.PurchaseId == purchaseId)
            .OrderBy(c => c.ChargeDate)
            .ToListAsync(ct);

        return charges.Select(ToChargeDto).ToList();
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
            .Include(o => o.Supplier)
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
            DiscountAmountForeign = dto.DiscountAmountForeign,
            AdvanceAmountForeign = dto.AdvanceAmountForeign,
            Notes = dto.Notes?.Trim()
        };
        invoice.SetExplicitAmounts(dto.TotalAmountXof, dto.DiscountAmountXof, dto.AdvanceAmountXof);

        DbContext.SupplierInvoices.Add(invoice);
        await DbContext.SaveChangesAsync(ct);

        var supplierName = order.Supplier?.Name ?? "";
        await PostInvoiceJournalEntryAsync(invoice, supplierName, ct);
        if (invoice.AdvanceAmountXof > 0)
            await PostAdvanceJournalEntryAsync(invoice, supplierName, ct);

        await DbContext.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<SupplierInvoiceDto> RegisterPaymentAsync(long invoiceId, RegisterSupplierPaymentDto dto, Stream? attachmentStream, string? attachmentFileName, CancellationToken ct = default)
    {
        var invoice = await DbContext.SupplierInvoices
            .Include(i => i.Supplier)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw new DomainException($"Facture fournisseur introuvable (Id={invoiceId}).");

        invoice.RegisterPayment(dto.Amount);
        await DbContext.SaveChangesAsync(ct);

        string? attachmentPath = null;
        if (attachmentStream is not null && !string.IsNullOrEmpty(attachmentFileName))
        {
            (attachmentPath, _) = await _fileStorage.SaveAsync(attachmentStream, "supplier-invoice-payments", attachmentFileName, ct);
        }

        var payment = new SupplierInvoicePayment
        {
            SupplierInvoiceId = invoice.Id,
            Amount = dto.Amount,
            PaymentDate = dto.PaymentDate == default ? DateOnly.FromDateTime(DateTime.UtcNow) : dto.PaymentDate,
            PaymentMethod = dto.PaymentMethod,
            Reference = dto.Reference,
            Notes = dto.Notes,
            AttachmentFileName = attachmentFileName,
            AttachmentPath = attachmentPath
        };
        DbContext.SupplierInvoicePayments.Add(payment);

        // Post accounting entry (JT – Journal de Trésorerie)
        // D: 401 Fournisseur / C: 521 Trésorerie
        var acc401 = await FindAccountAsync("401", ct);
        var acc521 = await FindAccountAsync("521", ct) ?? await FindAccountAsync("5211", ct);

        if (acc401 is not null && acc521 is not null)
        {
            var entryDate = payment.PaymentDate.ToDateTime(TimeOnly.MinValue);
            var entry = new JournalEntry
            {
                JournalCode = "JT",
                EntryDate   = entryDate,
                Reference   = $"REG-{invoice.InvoiceReference}",
                Description = $"Règlement facture fournisseur {invoice.Supplier?.Name} — {invoice.InvoiceReference}",
                SourceType  = "SupplierInvoicePayment",
                SourceId    = invoice.Id,
                IsPosted    = false
            };
            entry.AddLine(new JournalLine { AccountId = acc401.Id, Label = $"Règlement {invoice.InvoiceReference}", DebitAmount = dto.Amount, CreditAmount = 0, SupplierId = invoice.SupplierId });
            entry.AddLine(new JournalLine { AccountId = acc521.Id, Label = $"Règlement {invoice.InvoiceReference}", DebitAmount = 0, CreditAmount = dto.Amount });
            entry.Validate();
            DbContext.JournalEntries.Add(entry);
        }

        await DbContext.SaveChangesAsync(ct);
        return await GetInvoiceByIdAsync(invoiceId, ct) ?? throw new InvalidOperationException();
    }

    public async Task<PagedResult<SupplierInvoiceDto>> GetAllInvoicesAsync(int page, int size, string? status, long? supplierId = null, CancellationToken ct = default)
    {
        var skip = (page - 1) * size;
        var query = DbContext.SupplierInvoices
            .Include(i => i.Supplier)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(i => i.Status.ToString() == status);
        if (supplierId.HasValue)
            query = query.Where(i => i.SupplierId == supplierId.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(i => i.InvoiceDate)
            .Skip(skip).Take(size)
            .ToListAsync(ct);

        var ids = items.Select(i => i.Id).ToList();
        var payments = await DbContext.SupplierInvoicePayments
            .Where(p => ids.Contains(p.SupplierInvoiceId))
            .ToListAsync(ct);

        var dtos = items.Select(i => ToInvoiceDto(i, payments.Where(p => p.SupplierInvoiceId == i.Id))).ToList();
        return new PagedResult<SupplierInvoiceDto>(dtos, total, page, size);
    }

    public async Task<SupplierInvoiceDto?> GetInvoiceByIdAsync(long invoiceId, CancellationToken ct = default)
    {
        var invoice = await DbContext.SupplierInvoices
            .Include(i => i.Supplier)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, ct);
        if (invoice is null) return null;

        var payments = await DbContext.SupplierInvoicePayments
            .Where(p => p.SupplierInvoiceId == invoiceId)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync(ct);

        return ToInvoiceDto(invoice, payments);
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

        order.MarkGoodsReceived();  // → EnCoursDeRéception (allows multiple calls)

        // Generate arrivage reference
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
            SupplierOrderId = order.Id,
            TransportMode = dto.TransportMode?.Trim() ?? string.Empty,
            SupplierId = order.SupplierId,
            ContainerReference = order.ContainerReference,
            Notes = dto.Notes?.Trim()
        };
        purchase.SetExchangeRate(dto.ExchangeRateToXof);

        DbContext.Purchases.Add(purchase);
        await DbContext.SaveChangesAsync(ct);  // get purchase.Id

        decimal totalFobXof = 0m;
        decimal totalLostFobXof = 0m;

        // Keep (purchaseLine, lineInput) pairs for final price assignment
        var linePairs = new List<(PurchaseLine Line, ReceiveGoodsLineDto Input)>();

        foreach (var lineInput in dto.Lines)
        {
            var orderLine = order.Lines.FirstOrDefault(l => l.Id == lineInput.OrderLineId)
                ?? throw new DomainException($"Ligne de commande introuvable (Id={lineInput.OrderLineId}).");

            var product = await DbContext.Products
                .FirstOrDefaultAsync(p => p.Id == orderLine.ProductId, ct)
                ?? throw new DomainException($"Produit introuvable (Id={orderLine.ProductId}).");

            var unitsPerCarton = lineInput.UnitsPerCarton > 0 ? lineInput.UnitsPerCarton : 1;
            var lostCartons = Math.Max(0, lineInput.QuantityLostCartons);

            var purchaseLine = purchase.AddLine(
                product,
                lineInput.LotNumber,
                lineInput.QuantityCartons,
                lostCartons,
                unitsPerCarton,
                lineInput.UnitFobPricePerCarton,
                lineInput.ExpirationDate,
                lineInput.MarginRate > 0 ? lineInput.MarginRate : 0.10m);

            DbContext.PurchaseLines.Add(purchaseLine);
            await DbContext.SaveChangesAsync(ct);  // get purchaseLine.Id

            linePairs.Add((purchaseLine, lineInput));

            var lineFobXof = purchaseLine.UnitPurchasePriceXof * purchaseLine.Quantity;
            totalFobXof += lineFobXof;
            totalLostFobXof += purchaseLine.UnitPurchasePriceXof * lostCartons;

            // Stock entry: only good units enter the warehouse
            if (purchaseLine.GoodUnitsReceived > 0)
            {
                DbContext.StockMovements.Add(new StockMovement
                {
                    ProductId = product.Id,
                    WarehouseId = product.WarehouseId,
                    PurchaseLineId = purchaseLine.Id,
                    MovementType = StockMovementType.PurchaseEntry,
                    Quantity = purchaseLine.GoodUnitsReceived,
                    MovementDate = DateTime.UtcNow,
                    Reference = arrivalRef
                });
            }
        }

        await DbContext.SaveChangesAsync(ct);

        // Accounting: D:371 Marchandises / C:601 Achats — total FOB (all cartons paid)
        if (totalFobXof > 0)
        {
            await PostGoodsReceptionJournalEntryAsync(
                purchase, totalFobXof, order.Supplier?.Name ?? "", arrivalRef, ct);
        }

        // Accounting: D:6583 Pertes / C:371 Marchandises — value of damaged/lost goods
        if (totalLostFobXof > 0)
        {
            await PostLossJournalEntryAsync(
                purchase, totalLostFobXof, order.Supplier?.Name ?? "", arrivalRef, ct);

            // Auto-generate supplier credit note for the lost boxes
            var totalLostBoxes = dto.Lines.Sum(l => l.QuantityLostCartons); // upc=1 → cartons = boxes
            var creditNoteRef = await NextCreditNoteReferenceAsync(ct);
            var creditNote = new SupplierCreditNote
            {
                Reference = creditNoteRef,
                SupplierOrderId = order.Id,
                SupplierInvoiceId = order.SupplierInvoice?.Id,
                PurchaseId = purchase.Id,
                SupplierId = order.SupplierId,
                CreditNoteDate = DateOnly.FromDateTime(DateTime.UtcNow),
                AmountForeign = dto.ExchangeRateToXof > 0
                    ? Math.Round(totalLostFobXof / dto.ExchangeRateToXof, 4)
                    : 0m,
                Currency = order.Currency ?? "EUR",
                ExchangeRateToXof = dto.ExchangeRateToXof,
                AmountXof = Math.Round(totalLostFobXof, 2),
                LostBoxesCount = totalLostBoxes,
                Notes = $"Généré automatiquement — arrivage {arrivalRef}, {totalLostBoxes} boîte(s) perdues."
            };
            DbContext.SupplierCreditNotes.Add(creditNote);
            await DbContext.SaveChangesAsync(ct);
        }

        // Pricing structure charges: Commission → Fret → Transit → Frais transfert
        // Each charge cascades on top of the previous: PA × (1+comm) × (1+fret) × (1+trans) × (1+transf) = PR
        await AddPricingChargesAsync(purchase, dto, totalFobXof, arrivalRef, order.Supplier?.Name ?? "", ct);

        // After all charges, RecalculateCosts() has set UnitCostPriceXof (= PR per unit) on each line.
        // Now set the final selling price per line.
        foreach (var (pLine, lineInput) in linePairs)
        {
            pLine.SetFinalSellingPrice(lineInput.FixedSellingPriceHt);
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    private async Task AddPricingChargesAsync(
        Purchase purchase, ReceiveGoodsDto dto, decimal totalFobXof,
        string arrivalRef, string supplierName, CancellationToken ct)
    {
        if (totalFobXof <= 0) return;

        var chargeDate = DateOnly.FromDateTime(DateTime.UtcNow);
        // Running base for cascading rates
        var runningBase = totalFobXof;

        var charges = new[]
        {
            ("Commissions", "6342", dto.CommissionRate, "Commissions promo fournisseur"),
            ("Fret",        "6241", dto.FreightRate,    "Frais de fret"),
            ("Transit",     "6248", dto.TransitRate,    "Frais de transit"),
            ("FraisTransf", "6288", dto.TransferRate,   "Frais de transfert"),
        };

        foreach (var (chargeType, debitCode, rate, description) in charges)
        {
            if (rate <= 0) continue;

            var amount = Math.Round(runningBase * rate, 2);
            if (amount <= 0) continue;

            var charge = new PurchaseCharge
            {
                PurchaseId = purchase.Id,
                ChargeType = chargeType,
                Description = $"{description} — {arrivalRef}",
                AmountXof = amount,
                ChargeDate = chargeDate,
                Reference = $"PX-{arrivalRef}",
                DebitAccountCode = debitCode,
                CreditAccountCode = "401",
                Notes = $"Calculé automatiquement : {rate:P0} sur {runningBase:N0} XOF"
            };

            // AddCharge adds to _charges + triggers RecalculateCosts(); EF Core detects the new
            // entity in the tracked collection and will INSERT it on the next SaveChanges.
            // Do NOT also call DbContext.PurchaseCharges.Add(charge) — that would cause EF Core
            // relationship fixup to add the charge to _charges a second time, doubling all charges
            // in RecalculateCosts() and making UnitCostPriceXof ~2× too high.
            purchase.AddCharge(charge);
            await DbContext.SaveChangesAsync(ct);  // saves charge (gets Id) + updated line costs

            var journalEntry = await PostChargeJournalEntryAsync(purchase, charge, ct);
            if (journalEntry is not null)
            {
                charge.JournalEntryId = journalEntry.Id;
                await DbContext.SaveChangesAsync(ct);
            }

            // Cascade: next charge applies on the running total including this one
            runningBase += amount;
        }
    }

    public async Task<SupplierOrderDto> CloseReceptionAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Bon de commande introuvable (Id={id}).");

        order.CloseReception();
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<PurchaseChargeDto> AddPurchaseChargeAsync(
        long purchaseId, AddPurchaseChargeDto dto, CancellationToken ct = default)
    {
        var purchase = await DbContext.Purchases
            .Include(p => p.Lines)
            .Include(p => p.Charges)
            .FirstOrDefaultAsync(p => p.Id == purchaseId, ct)
            ?? throw new DomainException($"Arrivage introuvable (Id={purchaseId}).");

        if (dto.AmountXof <= 0)
            throw new DomainException("Le montant de la charge doit être strictement positif.");

        var charge = new PurchaseCharge
        {
            PurchaseId = purchaseId,
            ChargeType = dto.ChargeType.Trim(),
            Description = dto.Description.Trim(),
            AmountXof = dto.AmountXof,
            ChargeDate = dto.ChargeDate,
            Reference = dto.Reference?.Trim(),
            DebitAccountCode = dto.DebitAccountCode.Trim(),
            CreditAccountCode = dto.CreditAccountCode.Trim(),
            Notes = dto.Notes?.Trim()
        };

        DbContext.PurchaseCharges.Add(charge);
        await DbContext.SaveChangesAsync(ct);  // get charge.Id

        // Post the journal entry for this charge
        var journalEntry = await PostChargeJournalEntryAsync(purchase, charge, ct);
        if (journalEntry is not null)
        {
            charge.JournalEntryId = journalEntry.Id;
        }

        // Add charge to purchase and recalculate unit costs
        purchase.AddCharge(charge);
        await DbContext.SaveChangesAsync(ct);

        return ToChargeDto(charge);
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

    private async Task<ChartAccount?> FindAccountAsync(string code, CancellationToken ct)
        => await DbContext.ChartAccounts.FirstOrDefaultAsync(a => a.Code == code, ct);

    private async Task PostInvoiceJournalEntryAsync(
        SupplierInvoice invoice, string supplierName, CancellationToken ct)
    {
        var achatAccount = await FindAccountAsync("601", ct) ?? await FindAccountAsync("6011", ct);
        var fournisseurAccount = await FindAccountAsync("401", ct);

        if (achatAccount is null || fournisseurAccount is null) return;

        var netXof = invoice.NetAmountXof;
        var entry = new JournalEntry
        {
            JournalCode = "ACH",
            EntryDate = DateTime.UtcNow,
            Reference = invoice.InvoiceReference,
            Description = $"Facture fournisseur {supplierName} ({invoice.Currency}) — {invoice.InvoiceReference}",
            SourceType = "SupplierInvoice",
            SourceId = invoice.Id,
            IsPosted = true
        };

        entry.AddLine(new JournalLine
        {
            AccountId = achatAccount.Id,
            Label = $"Achats — {supplierName}",
            DebitAmount = netXof,
            CreditAmount = 0m,
            SupplierId = invoice.SupplierId
        });
        entry.AddLine(new JournalLine
        {
            AccountId = fournisseurAccount.Id,
            Label = $"Fournisseur {supplierName} / {invoice.InvoiceReference}",
            DebitAmount = 0m,
            CreditAmount = netXof,
            SupplierId = invoice.SupplierId
        });

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
    }

    private async Task PostAdvanceJournalEntryAsync(
        SupplierInvoice invoice, string supplierName, CancellationToken ct)
    {
        // D: 401 Fournisseur (avance réduit la dette fournisseur) / C: 521 Banque
        var fournisseurAccount = await FindAccountAsync("401", ct);
        var banqueAccount = await FindAccountAsync("521", ct) ?? await FindAccountAsync("5211", ct);

        if (fournisseurAccount is null || banqueAccount is null) return;

        var advXof = invoice.AdvanceAmountXof;
        var entry = new JournalEntry
        {
            JournalCode = "BNQ",
            EntryDate = DateTime.UtcNow,
            Reference = $"ADV-{invoice.InvoiceReference}",
            Description = $"Avance versée — {supplierName} / {invoice.InvoiceReference}",
            SourceType = "SupplierAdvance",
            SourceId = invoice.Id,
            IsPosted = true
        };

        entry.AddLine(new JournalLine
        {
            AccountId = fournisseurAccount.Id,
            Label = $"Avance fournisseur {supplierName} / {invoice.InvoiceReference}",
            DebitAmount = advXof,
            CreditAmount = 0m,
            SupplierId = invoice.SupplierId
        });
        entry.AddLine(new JournalLine
        {
            AccountId = banqueAccount.Id,
            Label = $"Paiement avance {supplierName}",
            DebitAmount = 0m,
            CreditAmount = advXof,
            SupplierId = invoice.SupplierId
        });

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
    }

    private async Task PostGoodsReceptionJournalEntryAsync(
        Purchase purchase, decimal totalFobXof, string supplierName, string arrivalRef, CancellationToken ct)
    {
        var stockAccount = await FindAccountAsync("371", ct)
            ?? await FindAccountAsync("370", ct)
            ?? await FindAccountAsync("37", ct);
        var achatAccount = await FindAccountAsync("601", ct)
            ?? await FindAccountAsync("6011", ct);

        if (stockAccount is null || achatAccount is null) return;

        var entry = new JournalEntry
        {
            JournalCode = "ACH",
            EntryDate = DateTime.UtcNow,
            Reference = arrivalRef,
            Description = $"Réception marchandises {supplierName} — {arrivalRef}",
            SourceType = "PurchaseEntry",
            SourceId = purchase.Id,
            IsPosted = true
        };

        entry.AddLine(new JournalLine
        {
            AccountId = stockAccount.Id,
            Label = $"Entrée stock — {supplierName} ({arrivalRef})",
            DebitAmount = totalFobXof,
            CreditAmount = 0m,
            SupplierId = purchase.SupplierId
        });
        entry.AddLine(new JournalLine
        {
            AccountId = achatAccount.Id,
            Label = $"Contrepartie achats — {arrivalRef}",
            DebitAmount = 0m,
            CreditAmount = totalFobXof,
            SupplierId = purchase.SupplierId
        });

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
    }

    private async Task PostLossJournalEntryAsync(
        Purchase purchase, decimal lossAmountXof, string supplierName, string arrivalRef, CancellationToken ct)
    {
        // D: 6583 Pertes sur marchandises / C: 371 Marchandises
        var pertesAccount = await FindAccountAsync("6583", ct)
            ?? await FindAccountAsync("658", ct)
            ?? await FindAccountAsync("65", ct);
        var stockAccount = await FindAccountAsync("371", ct)
            ?? await FindAccountAsync("370", ct);

        if (pertesAccount is null || stockAccount is null) return;

        var entry = new JournalEntry
        {
            JournalCode = "OD",
            EntryDate = DateTime.UtcNow,
            Reference = $"PERTE-{arrivalRef}",
            Description = $"Pertes sur marchandises — {supplierName} ({arrivalRef})",
            SourceType = "PurchaseLoss",
            SourceId = purchase.Id,
            IsPosted = true
        };

        entry.AddLine(new JournalLine
        {
            AccountId = pertesAccount.Id,
            Label = $"Pertes arrivage {arrivalRef} — {supplierName}",
            DebitAmount = lossAmountXof,
            CreditAmount = 0m,
            SupplierId = purchase.SupplierId
        });
        entry.AddLine(new JournalLine
        {
            AccountId = stockAccount.Id,
            Label = $"Sortie stock pertes {arrivalRef}",
            DebitAmount = 0m,
            CreditAmount = lossAmountXof,
            SupplierId = purchase.SupplierId
        });

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
    }

    private async Task<JournalEntry?> PostChargeJournalEntryAsync(
        Purchase purchase, PurchaseCharge charge, CancellationToken ct)
    {
        var debitAccount = await FindAccountAsync(charge.DebitAccountCode, ct);
        var creditAccount = await FindAccountAsync(charge.CreditAccountCode, ct);

        if (debitAccount is null || creditAccount is null) return null;

        var entry = new JournalEntry
        {
            JournalCode = "OD",
            EntryDate = charge.ChargeDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            Reference = charge.Reference ?? $"CHG-{purchase.Reference}",
            Description = $"{charge.ChargeType} — {charge.Description} ({purchase.Reference})",
            SourceType = "PurchaseCharge",
            SourceId = purchase.Id,
            IsPosted = true
        };

        entry.AddLine(new JournalLine
        {
            AccountId = debitAccount.Id,
            Label = charge.Description,
            DebitAmount = charge.AmountXof,
            CreditAmount = 0m,
            SupplierId = purchase.SupplierId
        });
        entry.AddLine(new JournalLine
        {
            AccountId = creditAccount.Id,
            Label = $"Règlement {charge.ChargeType.ToLower()} — {purchase.Reference}",
            DebitAmount = 0m,
            CreditAmount = charge.AmountXof,
            SupplierId = purchase.SupplierId
        });

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
        await DbContext.SaveChangesAsync(ct);

        return entry;
    }

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
        o.SupplierInvoice?.InvoiceReference,
        o.SupplierInvoice?.Status.ToString(),
        o.SupplierInvoice?.NetAmountXof,
        o.SupplierInvoice?.AmountPaid,
        o.SupplierInvoice?.BalanceDue,
        o.CreatedAt,
        o.UpdatedAt);

    private SupplierOrderDto ToDto(SupplierOrder o) => new(
        o.Id,
        o.Reference,
        o.OrderDate,
        o.SupplierId,
        o.Supplier?.Name ?? "",
        o.Supplier?.CountryId,
        o.Supplier?.Country?.Name,
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

    private SupplierInvoiceDto ToInvoiceDto(SupplierInvoice i, IEnumerable<SupplierInvoicePayment>? payments = null) => new(
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
        i.DiscountAmountForeign,
        i.DiscountAmountXof,
        i.AdvanceAmountForeign,
        i.AdvanceAmountXof,
        i.NetAmountXof,
        i.Status.ToString(),
        i.AmountPaid,
        i.BalanceDue,
        i.Notes,
        (payments ?? []).Select(p => new SupplierInvoicePaymentDto(
            p.Id, p.SupplierInvoiceId, p.Amount, p.PaymentDate,
            p.PaymentMethod, p.Reference, p.Notes,
            p.AttachmentFileName,
            p.AttachmentPath is null ? null : _fileStorage.GetPublicUrl(p.AttachmentPath),
            p.CreatedAt)).ToList(),
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
        l.Product?.Packaging?.UnitsPerPackaging,
        l.UnitFobPrice);

    private SupplierOrderDocumentDto ToDocumentDto(SupplierOrderDocument d) => new(
        d.Id,
        d.DocumentType,
        d.FileName,
        _fileStorage.GetPublicUrl(d.FilePath),
        d.FileSize,
        d.CreatedAt);

    private static PurchaseSummaryDto ToPurchaseSummaryDto(Purchase p) => new(
        p.Id,
        p.Reference,
        DateOnly.FromDateTime(p.ArrivalDate ?? p.PurchaseDate),
        p.TransportMode,
        p.SupplierId,
        p.Supplier?.Name ?? "",
        p.ContainerReference,
        p.TotalFobXof,
        p.TotalChargesXof,
        p.TotalGoodUnits,
        p.TotalLostCartons,
        p.Lines.Count,
        p.Notes,
        p.CreatedAt,
        p.Charges.Select(ToChargeDto).ToList());

    private static PurchaseChargeDto ToChargeDto(PurchaseCharge c) => new(
        c.Id,
        c.PurchaseId,
        c.ChargeType,
        c.Description,
        c.AmountXof,
        c.ChargeDate,
        c.Reference,
        c.DebitAccountCode,
        c.CreditAccountCode,
        c.JournalEntryId,
        c.Notes,
        c.CreatedAt);

    // ── Factures avoir fournisseurs ──────────────────────────────────────────────

    public async Task<PagedResult<SupplierCreditNoteDto>> GetAllCreditNotesAsync(
        int page, int size, string? status, long? supplierId = null, CancellationToken ct = default)
    {
        var query = DbContext.SupplierCreditNotes
            .Include(c => c.Supplier)
            .Include(c => c.SupplierOrder)
            .Include(c => c.SupplierInvoice)
            .Include(c => c.Purchase)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SupplierCreditNoteStatus>(status, out var s))
            query = query.Where(c => c.Status == s);
        if (supplierId.HasValue)
            query = query.Where(c => c.SupplierId == supplierId.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(c => c.CreditNoteDate)
            .Skip((page - 1) * size).Take(size)
            .ToListAsync(ct);

        return new PagedResult<SupplierCreditNoteDto>(items.Select(ToCreditNoteDto).ToList(), total, page, size);
    }

    public async Task<IReadOnlyList<SupplierCreditNoteDto>> GetCreditNotesByOrderAsync(long orderId, CancellationToken ct = default)
    {
        var items = await DbContext.SupplierCreditNotes
            .Include(c => c.Supplier)
            .Include(c => c.SupplierOrder)
            .Include(c => c.SupplierInvoice)
            .Include(c => c.Purchase)
            .Where(c => c.SupplierOrderId == orderId)
            .OrderByDescending(c => c.CreditNoteDate)
            .ToListAsync(ct);

        return items.Select(ToCreditNoteDto).ToList();
    }

    public async Task<SupplierCreditNoteDto> UpdateCreditNoteStatusAsync(
        long creditNoteId, UpdateCreditNoteStatusDto dto, CancellationToken ct = default)
    {
        var creditNote = await DbContext.SupplierCreditNotes
            .Include(c => c.Supplier)
            .Include(c => c.SupplierOrder)
            .Include(c => c.SupplierInvoice)
            .Include(c => c.Purchase)
            .FirstOrDefaultAsync(c => c.Id == creditNoteId, ct)
            ?? throw new DomainException($"Facture avoir introuvable (Id={creditNoteId}).");

        if (!Enum.TryParse<SupplierCreditNoteStatus>(dto.Status, out var newStatus))
            throw new DomainException($"Statut invalide : {dto.Status}");

        creditNote.UpdateStatus(newStatus, dto.Notes);
        await DbContext.SaveChangesAsync(ct);

        return ToCreditNoteDto(creditNote);
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
            .Select(r => { var parts = r.Split('-'); return parts.Length == 3 && int.TryParse(parts[2], out var n) ? n : 0; })
            .DefaultIfEmpty(0).Max();

        return $"{prefix}{(max + 1):D3}";
    }

    private static SupplierCreditNoteDto ToCreditNoteDto(SupplierCreditNote c) => new(
        c.Id,
        c.Reference,
        c.SupplierOrderId,
        c.SupplierOrder?.Reference ?? "",
        c.SupplierInvoiceId,
        c.SupplierInvoice?.InvoiceReference,
        c.PurchaseId,
        c.Purchase?.Reference ?? "",
        c.SupplierId,
        c.Supplier?.Name ?? "",
        c.CreditNoteDate,
        c.AmountForeign,
        c.Currency,
        c.ExchangeRateToXof,
        c.AmountXof,
        c.LostBoxesCount,
        c.Status.ToString(),
        c.Notes,
        c.ResolvedAt,
        c.CreatedAt);

    public async Task SendOrderByEmailAsync(long orderId, string? recipientEmail, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Supplier)
            .Include(o => o.Lines)
                .ThenInclude(l => l.Product)
                    .ThenInclude(p => p!.Packaging)
            .Include(o => o.Lines)
                .ThenInclude(l => l.Product)
                    .ThenInclude(p => p!.Dosage)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new DomainException($"Commande introuvable (Id={orderId}).");

        var toEmail = string.IsNullOrWhiteSpace(recipientEmail) ? order.Supplier?.Email : recipientEmail.Trim();
        if (string.IsNullOrEmpty(toEmail))
            throw new DomainException("Aucun email destinataire — renseignez l'email du fournisseur ou saisissez un destinataire.");

        var lineData = order.Lines.Select(l => (
            Label: $"{l.Product?.Designation ?? "—"}{(l.Product?.Packaging?.Name != null ? $" ({l.Product.Packaging.Name})" : "")}",
            Qty: l.Quantity,
            Unit: l.OrderUnit
        ));

        var html = EmailTemplateService.BuildPurchaseOrderEmail(
            order.Supplier?.Name ?? "—",
            order.Reference,
            DateOnly.FromDateTime(order.OrderDate),
            order.Currency,
            lineData,
            order.Notes);

        await _emailService.SendEmailAsync(toEmail, $"Bon de commande {order.Reference} — LabMedis", html);
    }
}
