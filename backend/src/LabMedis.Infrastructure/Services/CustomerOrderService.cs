using LabMedis.Application.Dtos.CustomerOrders;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Services;

public class CustomerOrderService : BaseRepository<CustomerOrder>, ICustomerOrderService
{
    public CustomerOrderService(AppDbContext dbContext) : base(dbContext) { }

    // ── Queries ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<CustomerOrderSummaryDto>> GetAllAsync(
        int page, int size, string? status, long? customerId, CancellationToken ct = default)
    {
        var q = DbSet
            .Include(o => o.Customer)
            .Include(o => o.Invoice)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CustomerOrderStatus>(status, true, out var s))
            q = q.Where(o => o.Status == s);
        if (customerId.HasValue)
            q = q.Where(o => o.CustomerId == customerId);

        q = q.OrderByDescending(o => o.OrderDate).ThenByDescending(o => o.Id);

        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * size).Take(size).ToListAsync(ct);

        var customerIds = items.Select(o => o.CustomerId).Distinct().ToList();
        var balances = await GetBalancesAsync(customerIds, ct);

        return new PagedResult<CustomerOrderSummaryDto>(
            items.Select(o => ToSummaryDto(o, balances.GetValueOrDefault(o.CustomerId))).ToList(),
            total, page, size);
    }

    public async Task<CustomerOrderDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Customer)
            .Include(o => o.Invoice)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null) return null;

        var balance = (await GetBalancesAsync(new[] { order.CustomerId }, ct))
            .GetValueOrDefault(order.CustomerId);

        var linesDtos = new List<CustomerOrderLineDto>();
        foreach (var line in order.Lines)
        {
            var available = await GetAvailableStockCoreAsync(line.ProductId, id, ct);
            linesDtos.Add(ToLineDto(line, available));
        }

        return ToDto(order, balance, linesDtos);
    }

    // ── Mutations ────────────────────────────────────────────────────────────────

    public async Task<CustomerOrderDto> CreateAsync(CustomerOrderCreateDto dto, CancellationToken ct = default)
    {
        if (dto.Lines.Count == 0)
            throw new DomainException("Une commande doit contenir au moins une ligne.");

        var customerExists = await DbContext.Customers
            .AnyAsync(c => c.Id == dto.CustomerId, ct);
        if (!customerExists)
            throw new DomainException($"Client introuvable (Id={dto.CustomerId}).");

        var lines = await BuildLinesAsync(dto.Lines, dto.VatApplied, null, ct);

        var order = new CustomerOrder
        {
            CustomerId = dto.CustomerId,
            OrderDate = dto.OrderDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            VatApplied = dto.VatApplied,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "XOF" : dto.Currency.Trim().ToUpperInvariant(),
            Notes = dto.Notes?.Trim()
        };

        var reference = await NextReferenceAsync(ct);
        order.SetReference(reference);

        // Compute totals from lines
        order.TotalHt = lines.Sum(l => l.LineTotalHt);
        order.TotalTva = lines.Sum(l => l.LineTotalTva);
        order.TotalTtc = order.TotalHt + order.TotalTva;
        order.TotalCost = lines.Sum(l => l.LineTotalCost);
        order.Profit = order.TotalHt - order.TotalCost;

        DbContext.CustomerOrders.Add(order);

        // Add lines — EF will assign CustomerOrderId from the relationship
        foreach (var line in lines)
        {
            line.CustomerOrder = order;
            DbContext.CustomerOrderLines.Add(line);
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(order.Id, ct) ?? throw new InvalidOperationException("Order not found after creation.");
    }

    public async Task<CustomerOrderDto?> UpdateAsync(long id, CustomerOrderUpdateDto dto, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null) return null;

        if (order.Status == CustomerOrderStatus.Terminée || order.Status == CustomerOrderStatus.Annulée)
            throw new DomainException("Une commande terminée ou annulée ne peut pas être modifiée.");

        if (dto.Lines.Count == 0)
            throw new DomainException("Une commande doit contenir au moins une ligne.");

        // Remove existing lines
        var existingLines = order.Lines.ToList();
        DbContext.CustomerOrderLines.RemoveRange(existingLines);
        await DbContext.SaveChangesAsync(ct);

        // Build new lines (exclude this order from stock reservation check)
        var newLines = await BuildLinesAsync(dto.Lines, dto.VatApplied, id, ct);

        order.OrderDate = dto.OrderDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        order.VatApplied = dto.VatApplied;
        order.Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "XOF" : dto.Currency.Trim().ToUpperInvariant();
        order.Notes = dto.Notes?.Trim();

        // Set updated totals
        order.TotalHt = newLines.Sum(l => l.LineTotalHt);
        order.TotalTva = newLines.Sum(l => l.LineTotalTva);
        order.TotalTtc = order.TotalHt + order.TotalTva;
        order.TotalCost = newLines.Sum(l => l.LineTotalCost);
        order.Profit = order.TotalHt - order.TotalCost;

        foreach (var line in newLines)
        {
            line.CustomerOrderId = order.Id;
            line.CustomerOrder = order;
            DbContext.CustomerOrderLines.Add(line);
        }

        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<CustomerOrderDto> ValidateAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Customer)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Commande introuvable (Id={id}).");

        if (order.Status != CustomerOrderStatus.EnAttente)
            throw new DomainException("Seule une commande en attente peut être validée.");

        if (!order.Lines.Any())
            throw new DomainException("Impossible de valider une commande sans ligne.");

        // Verify stock availability
        foreach (var line in order.Lines)
        {
            var available = await GetAvailableStockCoreAsync(line.ProductId, id, ct);
            if (line.Quantity > available)
                throw new DomainException(
                    $"Stock insuffisant pour '{line.Product?.Designation}' : {available} dispo, {line.Quantity} demandé(s).");
        }

        // Create Invoice (Draft)
        var vatRate = order.VatApplied ? 0.18m : 0m;
        var invoice = new Invoice
        {
            Reference = $"{order.Reference}-FAC",
            InvoiceDate = order.OrderDate,
            DueDate = order.OrderDate.AddDays(30),
            CustomerId = order.CustomerId,
            Notes = $"Générée depuis commande {order.Reference}"
        };

        foreach (var line in order.Lines)
        {
            if (line.Product is null) throw new DomainException($"Produit Id={line.ProductId} introuvable.");
            invoice.AddLine(line.Product, line.Quantity, line.UnitPriceHt, 0m, vatRate);
        }

        DbContext.Invoices.Add(invoice);
        await DbContext.SaveChangesAsync(ct);

        order.Validate(invoice.Id);
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<CustomerOrderDto> CompleteAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Customer).ThenInclude(c => c!.ChartAccount)
            .Include(o => o.Invoice).ThenInclude(i => i!.Lines)
            .Include(o => o.Lines).ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Commande introuvable (Id={id}).");

        if (order.Status != CustomerOrderStatus.Validée)
            throw new DomainException("Seule une commande validée peut être clôturée.");

        // 1. Consume stock FIFO per line + create StockMovements
        foreach (var line in order.Lines)
        {
            var lots = await DbContext.PurchaseLines
                .Where(pl => pl.ProductId == line.ProductId && !pl.IsDeleted && pl.QuantityRemaining > 0)
                .OrderBy(pl => pl.ExpirationDate == null ? 1 : 0)
                .ThenBy(pl => pl.ExpirationDate)
                .ThenBy(pl => pl.Id)
                .ToListAsync(ct);

            int remaining = line.Quantity;
            foreach (var lot in lots)
            {
                if (remaining <= 0) break;
                int consume = Math.Min(remaining, lot.QuantityRemaining);
                lot.ConsumeStock(consume);

                DbContext.StockMovements.Add(new StockMovement
                {
                    ProductId = line.ProductId,
                    WarehouseId = line.Product!.WarehouseId,
                    PurchaseLineId = lot.Id,
                    MovementType = StockMovementType.SaleExit,
                    Quantity = -consume,
                    MovementDate = DateTime.UtcNow,
                    Reference = order.Reference,
                    Notes = $"Vente – {order.Customer?.Name}"
                });
                remaining -= consume;
            }

            if (remaining > 0)
                throw new DomainException(
                    $"Stock insuffisant pour '{line.Product?.Designation}' lors de la clôture.");
        }

        // 2. Issue Invoice
        order.Invoice?.Issue();

        // 3. Accounting entries
        await PostSaleAccountingAsync(order, ct);

        // 4. Complete the order
        order.Complete();
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    public async Task<CustomerOrderDto> CancelAsync(long id, CancellationToken ct = default)
    {
        var order = await DbSet
            .Include(o => o.Invoice).ThenInclude(i => i!.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new DomainException($"Commande introuvable (Id={id}).");

        order.Cancel();
        order.Invoice?.Cancel();
        await DbContext.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct) ?? throw new InvalidOperationException();
    }

    // ── Preview ──────────────────────────────────────────────────────────────────

    public async Task<CustomerOrderPreviewDto> PreviewAsync(CustomerOrderPreviewRequestDto dto, CancellationToken ct = default)
    {
        var lines = new List<CustomerOrderPreviewLineDto>();
        foreach (var input in dto.Lines)
        {
            if (input.Quantity <= 0) continue;
            var product = await DbContext.Products
                .FirstOrDefaultAsync(p => p.Id == input.ProductId, ct)
                ?? throw new DomainException($"Produit introuvable (Id={input.ProductId}).");

            var available = await GetAvailableStockCoreAsync(input.ProductId, null, ct);
            var (unitPrice, unitCost) = await GetFifoPricingAsync(input.ProductId, input.Quantity, ct);
            var lineHt = input.Quantity * unitPrice;
            var lineTva = dto.VatApplied ? Math.Round(lineHt * 0.18m, 2) : 0m;
            var lineCost = input.Quantity * unitCost;

            lines.Add(new CustomerOrderPreviewLineDto(
                product.Id, product.Code, product.Designation,
                input.Quantity, available,
                unitPrice, unitCost,
                lineHt, lineTva, lineHt + lineTva,
                lineCost,
                lineHt - lineCost));
        }

        var totalHt = lines.Sum(l => l.LineTotalHt);
        var totalTva = lines.Sum(l => l.LineTotalTva);
        var totalCost = lines.Sum(l => l.LineTotalCost);
        return new CustomerOrderPreviewDto(lines, totalHt, totalTva, totalHt + totalTva, totalCost, totalHt - totalCost);
    }

    public async Task<int> GetAvailableStockAsync(long productId, long? excludeOrderId = null, CancellationToken ct = default)
        => await GetAvailableStockCoreAsync(productId, excludeOrderId, ct);

    public async Task<CustomerStatsDto> GetCustomerStatsAsync(long customerId, CancellationToken ct = default)
    {
        var balance = (await GetBalancesAsync(new[] { customerId }, ct)).GetValueOrDefault(customerId);

        var totalOrderCount = await DbSet
            .Where(o => o.CustomerId == customerId && o.Status != CustomerOrderStatus.Annulée)
            .CountAsync(ct);

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var monthlyHt = await DbSet
            .Where(o => o.CustomerId == customerId
                     && o.Status == CustomerOrderStatus.Terminée
                     && o.OrderDate >= monthStart
                     && o.OrderDate < monthEnd)
            .SumAsync(o => (decimal?)o.TotalHt, ct) ?? 0m;

        var monthlyTtc = await DbSet
            .Where(o => o.CustomerId == customerId
                     && o.Status == CustomerOrderStatus.Terminée
                     && o.OrderDate >= monthStart
                     && o.OrderDate < monthEnd)
            .SumAsync(o => (decimal?)o.TotalTtc, ct) ?? 0m;

        return new CustomerStatsDto
        {
            CustomerId = customerId,
            Balance = balance,
            TotalOrderCount = totalOrderCount,
            MonthlyRevenueHt = monthlyHt,
            MonthlyRevenueTtc = monthlyTtc,
        };
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private async Task<int> GetAvailableStockCoreAsync(long productId, long? excludeOrderId, CancellationToken ct)
    {
        var totalStock = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == productId && !pl.IsDeleted)
            .SumAsync(pl => (int?)pl.QuantityRemaining, ct) ?? 0;

        var reserved = await DbContext.CustomerOrderLines
            .Where(ol => ol.ProductId == productId
                      && !ol.IsDeleted
                      && (ol.CustomerOrder!.Status == CustomerOrderStatus.EnAttente
                       || ol.CustomerOrder!.Status == CustomerOrderStatus.Validée)
                      && (excludeOrderId == null || ol.CustomerOrderId != excludeOrderId))
            .SumAsync(ol => (int?)ol.Quantity, ct) ?? 0;

        return Math.Max(0, totalStock - reserved);
    }

    private async Task<(decimal unitPriceHt, decimal unitCostPrice)> GetFifoPricingAsync(
        long productId, int quantity, CancellationToken ct)
    {
        if (quantity <= 0) return (0, 0);

        var lots = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == productId && !pl.IsDeleted && pl.QuantityRemaining > 0)
            .OrderBy(pl => pl.ExpirationDate == null ? 1 : 0)
            .ThenBy(pl => pl.ExpirationDate)
            .ThenBy(pl => pl.Id)
            .ToListAsync(ct);

        if (!lots.Any())
            return (0, 0);

        decimal totalPrice = 0, totalCost = 0;
        int remaining = quantity;

        foreach (var lot in lots)
        {
            if (remaining <= 0) break;
            int take = Math.Min(remaining, lot.QuantityRemaining);
            totalPrice += take * lot.TargetSellingPriceHt;
            totalCost += take * lot.UnitCostPriceXof;
            remaining -= take;
        }

        if (remaining > 0)
        {
            // Not enough stock, use first lot prices as fallback
            return (lots[0].TargetSellingPriceHt, lots[0].UnitCostPriceXof);
        }

        return (Math.Round(totalPrice / quantity, 4), Math.Round(totalCost / quantity, 4));
    }

    private async Task<List<CustomerOrderLine>> BuildLinesAsync(
        IReadOnlyList<CustomerOrderLineInputDto> inputs, bool vatApplied, long? excludeOrderId, CancellationToken ct)
    {
        var lines = new List<CustomerOrderLine>();
        foreach (var input in inputs)
        {
            if (input.Quantity <= 0)
                throw new DomainException($"La quantité doit être positive (produit Id={input.ProductId}).");

            var productExists = await DbContext.Products
                .AnyAsync(p => p.Id == input.ProductId, ct);
            if (!productExists)
                throw new DomainException($"Produit introuvable (Id={input.ProductId}).");

            var available = await GetAvailableStockCoreAsync(input.ProductId, excludeOrderId, ct);
            if (input.Quantity > available)
                throw new DomainException(
                    $"Quantité demandée ({input.Quantity}) dépasse le stock disponible ({available}) pour le produit Id={input.ProductId}.");

            var (unitPrice, unitCost) = await GetFifoPricingAsync(input.ProductId, input.Quantity, ct);

            var line = new CustomerOrderLine
            {
                ProductId = input.ProductId,
                Quantity = input.Quantity,
                UnitPriceHt = unitPrice,
                UnitCostPrice = unitCost
            };
            line.ComputeAmounts(vatApplied);
            lines.Add(line);
        }
        return lines;
    }

    private async Task PostSaleAccountingAsync(CustomerOrder order, CancellationToken ct)
    {
        var customer = order.Customer
            ?? await DbContext.Customers.Include(c => c.ChartAccount)
                .FirstOrDefaultAsync(c => c.Id == order.CustomerId, ct)
            ?? throw new DomainException("Client introuvable.");

        if (customer.ChartAccountId is null)
            throw new DomainException($"Aucun compte comptable configuré pour le client '{customer.Name}'. Veuillez configurer un compte client dans le plan comptable.");

        var clientAccount = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Id == customer.ChartAccountId, ct)
            ?? throw new DomainException("Compte client introuvable dans le plan comptable.");

        var salesAccount = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Code == "701", ct)
            ?? throw new DomainException("Compte 701 (Ventes) introuvable dans le plan comptable.");

        var stockAccount = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Code == "311", ct)
            ?? throw new DomainException("Compte 311 (Marchandises) introuvable dans le plan comptable.");

        var stockVarAccount = await DbContext.ChartAccounts
            .FirstOrDefaultAsync(a => a.Code == "6011", ct)
            ?? throw new DomainException("Compte 6011 (Variation de stocks) introuvable dans le plan comptable.");

        // Get totals from DB lines
        var dbLines = await DbContext.CustomerOrderLines
            .Where(l => l.CustomerOrderId == order.Id && !l.IsDeleted)
            .ToListAsync(ct);

        var totalHt = dbLines.Sum(l => l.LineTotalHt);
        var totalTva = dbLines.Sum(l => l.LineTotalTva);
        var totalTtc = totalHt + totalTva;
        var totalCost = dbLines.Sum(l => l.LineTotalCost);

        var entry = new JournalEntry
        {
            JournalCode = "JV",
            EntryDate = DateTime.UtcNow,
            Reference = order.Reference,
            Description = $"Vente – Commande {order.Reference} – {customer.Name}",
            SourceType = "CustomerOrderCompleted",
            SourceId = order.Id,
            IsPosted = true
        };

        // Dr Client (TTC)
        entry.AddLine(new JournalLine
        {
            AccountId = clientAccount.Id,
            CustomerId = order.CustomerId,
            Label = $"Vente à {customer.Name}",
            DebitAmount = totalTtc,
            CreditAmount = 0
        });

        // Cr Ventes (HT)
        entry.AddLine(new JournalLine
        {
            AccountId = salesAccount.Id,
            Label = "Ventes de marchandises",
            DebitAmount = 0,
            CreditAmount = totalHt
        });

        // Cr TVA collectée
        if (order.VatApplied && totalTva > 0)
        {
            var tvaAccount = await DbContext.ChartAccounts
                .FirstOrDefaultAsync(a => a.Code == "4431", ct)
                ?? throw new DomainException("Compte 4431 (TVA collectée) introuvable dans le plan comptable.");
            entry.AddLine(new JournalLine
            {
                AccountId = tvaAccount.Id,
                Label = "TVA collectée 18%",
                DebitAmount = 0,
                CreditAmount = totalTva
            });
        }

        // Dr Variation stocks / Cr Stock (COGS)
        if (totalCost > 0)
        {
            entry.AddLine(new JournalLine
            {
                AccountId = stockVarAccount.Id,
                Label = "Coût des marchandises vendues",
                DebitAmount = totalCost,
                CreditAmount = 0
            });
            entry.AddLine(new JournalLine
            {
                AccountId = stockAccount.Id,
                Label = "Déstockage marchandises",
                DebitAmount = 0,
                CreditAmount = totalCost
            });
        }

        entry.Validate();
        DbContext.JournalEntries.Add(entry);
    }

    private async Task<Dictionary<long, decimal>> GetBalancesAsync(IEnumerable<long> customerIds, CancellationToken ct)
    {
        var ids = customerIds.ToList();
        if (ids.Count == 0) return new Dictionary<long, decimal>();

        var rows = await DbContext.JournalLines
            .Where(l => l.CustomerId.HasValue && ids.Contains(l.CustomerId!.Value))
            .GroupBy(l => l.CustomerId!.Value)
            .Select(g => new
            {
                CustomerId = g.Key,
                Balance = g.Sum(l => l.DebitAmount) - g.Sum(l => l.CreditAmount)
            })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.CustomerId, r => r.Balance);
    }

    private async Task<string> NextReferenceAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"CMD-{year}-";
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

    private static CustomerOrderSummaryDto ToSummaryDto(CustomerOrder o, decimal balance) => new(
        o.Id, o.Reference, o.OrderDate,
        o.CustomerId, o.Customer?.Name ?? "", balance,
        o.Status.ToString(), o.VatApplied, o.Currency,
        o.TotalHt, o.TotalTva, o.TotalTtc, o.TotalCost, o.Profit,
        o.InvoiceId, o.Invoice?.Reference,
        o.CreatedAt, o.UpdatedAt);

    private static CustomerOrderDto ToDto(CustomerOrder o, decimal balance, IReadOnlyList<CustomerOrderLineDto> lines) => new(
        o.Id, o.Reference, o.OrderDate,
        o.CustomerId, o.Customer?.Name ?? "", balance,
        o.Status.ToString(), o.VatApplied, o.Currency, o.Notes,
        o.TotalHt, o.TotalTva, o.TotalTtc, o.TotalCost, o.Profit,
        o.InvoiceId, o.Invoice?.Reference,
        lines, o.CreatedAt, o.UpdatedAt);

    private static CustomerOrderLineDto ToLineDto(CustomerOrderLine l, int available) => new(
        l.Id, l.ProductId,
        l.Product?.Code ?? "", l.Product?.Designation ?? "",
        l.Quantity, available,
        l.UnitPriceHt, l.UnitCostPrice,
        l.LineTotalHt, l.LineTotalTva, l.LineTotalTtc, l.LineTotalCost,
        l.LineTotalHt - l.LineTotalCost);
}
