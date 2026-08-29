using LabMedis.Application.Dtos.Products;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Enums;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class ProductService : BaseRepository<Product>, IProductService
{
    private readonly ILogger<ProductService> _logger;

    public ProductService(AppDbContext dbContext, ILogger<ProductService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<ProductDto>> GetAllAsync(int page = 1, int size = 10, string? search = null, long? categoryId = null, long? therapeuticClassId = null, long? supplierId = null, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        var q = includeDeleted ? DbSet.IgnoreQueryFilters().AsQueryable() : DbSet.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(p => p.Designation.ToLower().Contains(s)
                           || p.Code.ToLower().Contains(s)
                           || (p.ActiveIngredient != null && p.ActiveIngredient.ToLower().Contains(s)));
        }
        if (categoryId is not null) q = q.Where(p => p.CategoryId == categoryId);
        if (therapeuticClassId is not null) q = q.Where(p => p.TherapeuticClassId == therapeuticClassId);
        if (supplierId is not null) q = q.Where(p => p.SupplierId == supplierId);

        var skip = (page - 1) * size;
        var total = await q.CountAsync(cancellationToken);
        var products = await q
            .Include(p => p.Warehouse)
            .Include(p => p.Category)
            .Include(p => p.TherapeuticClass)
            .Include(p => p.ProductForm)
            .Include(p => p.Dosage)
            .Include(p => p.Packaging)
            .Include(p => p.OriginCountry)
            .Include(p => p.CustomsRegime)
            .Include(p => p.Supplier)
            .OrderBy(p => p.IsDeleted).ThenBy(p => p.Designation)
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);

        var productIds = products.Select(p => p.Id).ToList();
        var stockByProduct = await DbContext.PurchaseLines
            .Where(pl => productIds.Contains(pl.ProductId) && !pl.IsDeleted)
            .GroupBy(pl => pl.ProductId)
            .Select(g => new { ProductId = g.Key, Stock = g.Sum(pl => pl.QuantityRemaining) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Stock, cancellationToken);

        return new PagedResult<ProductDto>(
            products.Select(p => ToDto(p, stockByProduct.GetValueOrDefault(p.Id))).ToList(),
            total, page, size);
    }

    public async Task<IReadOnlyList<ProductDto>> GetAllForSelectAsync(CancellationToken cancellationToken = default)
    {
        var items = await DbSet
            .Include(p => p.Warehouse)
            .Include(p => p.Category)
            .Include(p => p.TherapeuticClass)
            .Include(p => p.ProductForm)
            .Include(p => p.Dosage)
            .Include(p => p.Packaging)
            .Include(p => p.OriginCountry)
            .Include(p => p.CustomsRegime)
            .Include(p => p.Supplier)
            .OrderBy(p => p.Designation)
            .ToListAsync(cancellationToken);
        return items.Select(p => ToDto(p)).ToList();
    }

    public async Task<ProductDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await DbSet
            .Include(p => p.Warehouse)
            .Include(p => p.Category)
            .Include(p => p.TherapeuticClass)
            .Include(p => p.ProductForm)
            .Include(p => p.Dosage)
            .Include(p => p.Packaging)
            .Include(p => p.OriginCountry)
            .Include(p => p.CustomsRegime)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (item is null) return null;

        var stock = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == id && !pl.IsDeleted)
            .SumAsync(pl => pl.QuantityRemaining, cancellationToken);
        return ToDto(item, stock);
    }

    public async Task<ProductHistoryDto?> GetHistoryAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await DbSet
            .Include(p => p.Warehouse)
            .Include(p => p.Category)
            .Include(p => p.TherapeuticClass)
            .Include(p => p.ProductForm)
            .Include(p => p.Dosage)
            .Include(p => p.Packaging)
            .Include(p => p.OriginCountry)
            .Include(p => p.CustomsRegime)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (entity is null) return null;

        var stockQuantity = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == id && !pl.IsDeleted)
            .SumAsync(pl => pl.QuantityRemaining, cancellationToken);

        var lots = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == id && !pl.IsDeleted)
            .OrderByDescending(pl => pl.Purchase!.PurchaseDate)
            .ThenByDescending(pl => pl.Id)
            .Select(pl => new ProductLotDto(
                pl.Id,
                pl.Purchase!.Reference,
                pl.Purchase.PurchaseDate,
                pl.Purchase.Supplier != null ? pl.Purchase.Supplier.Name : null,
                pl.LotNumber,
                pl.ExpirationDate,
                pl.Quantity,
                pl.QuantityRemaining,
                pl.UnitPurchasePriceXof,
                pl.UnitCostPriceXof,
                pl.TargetSellingPriceHt,
                pl.MarginRate,
                pl.CalculatedSellingPriceHt))
            .ToListAsync(cancellationToken);

        var invoiceLines = await DbContext.InvoiceLines
            .Where(il => il.ProductId == id && !il.IsDeleted)
            .OrderByDescending(il => il.Invoice!.InvoiceDate)
            .Select(il => new ProductInvoiceLineDto(
                il.InvoiceId,
                il.Invoice!.Reference,
                il.Invoice.InvoiceDate,
                il.Invoice.Customer != null ? il.Invoice.Customer.Name : null,
                il.Invoice.Status.ToString(),
                il.Quantity,
                il.UnitPriceHt,
                il.DiscountPercent,
                il.LineTotalHt,
                il.LineTotalTtc))
            .ToListAsync(cancellationToken);

        var movements = await DbContext.StockMovements
            .Where(sm => sm.ProductId == id && !sm.IsDeleted)
            .OrderByDescending(sm => sm.MovementDate)
            .Select(sm => new ProductStockMovementDto(
                sm.Id,
                sm.MovementDate,
                sm.MovementType.ToString(),
                sm.Quantity,
                sm.PurchaseLine != null ? sm.PurchaseLine.LotNumber : null,
                sm.Warehouse != null ? sm.Warehouse.Name : null,
                sm.Reference,
                sm.Notes))
            .ToListAsync(cancellationToken);

        // Quantity on active invoices not yet fully delivered
        var totalInvoicedQty = await DbContext.InvoiceLines
            .Where(il => il.ProductId == id && !il.IsDeleted
                && il.Invoice!.Status != InvoiceStatus.Draft
                && il.Invoice!.Status != InvoiceStatus.Cancelled)
            .SumAsync(il => (int?)il.Quantity, cancellationToken) ?? 0;

        var totalDeliveredQty = await DbContext.DeliveryLines
            .Where(dl => !dl.IsDeleted
                && dl.InvoiceLine!.ProductId == id
                && dl.Delivery!.Status == DeliveryStatus.Delivered)
            .SumAsync(dl => (int?)dl.QuantityDelivered, cancellationToken) ?? 0;

        var pendingDeliveryToClients = Math.Max(0, totalInvoicedQty - totalDeliveredQty);

        // Quantity on purchase orders not yet arrived (no arrivalDate)
        var pendingFromSuppliers = await DbContext.PurchaseLines
            .Where(pl => pl.ProductId == id && !pl.IsDeleted && pl.Purchase!.ArrivalDate == null)
            .SumAsync(pl => (int?)pl.Quantity, cancellationToken) ?? 0;

        return new ProductHistoryDto(
            ToDto(entity, stockQuantity),
            pendingDeliveryToClients,
            pendingFromSuppliers,
            lots,
            invoiceLines,
            movements);
    }

    public async Task<ProductDto> CreateAsync(ProductCreateDto dto, CancellationToken cancellationToken = default)
    {
        await ValidateForeignKeysAsync(dto.WarehouseId, dto.CategoryId, dto.TherapeuticClassId, dto.SupplierId,
            dto.ProductFormId, dto.DosageId, dto.PackagingId, dto.OriginCountryId, dto.CustomsRegimeId, cancellationToken);

        var code = await GenerateCodeAsync(dto.OriginCountryId, dto.SupplierId, dto.WarehouseId, null, cancellationToken);

        var entity = new Product
        {
            Code = code,
            Designation = dto.Designation.Trim(),
            CipCode = Trim(dto.CipCode),
            ActiveIngredient = Trim(dto.ActiveIngredient),
            WarehouseId = dto.WarehouseId,
            CategoryId = dto.CategoryId,
            TherapeuticClassId = dto.TherapeuticClassId,
            ProductFormId = dto.ProductFormId,
            DosageId = dto.DosageId,
            PackagingId = dto.PackagingId,
            OriginCountryId = dto.OriginCountryId,
            CustomsRegimeId = dto.CustomsRegimeId,
            SupplierId = dto.SupplierId
        };

        await CreateAsync(entity, cancellationToken);
        _logger.LogInformation("Produit créé Id={Id} Code={Code}", entity.Id, entity.Code);
        return await GetByIdAsync(entity.Id, cancellationToken) ?? ToDto(entity);
    }

    public async Task<ProductDto?> UpdateAsync(long id, ProductUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return null;

        await ValidateForeignKeysAsync(dto.WarehouseId, dto.CategoryId, dto.TherapeuticClassId, dto.SupplierId,
            dto.ProductFormId, dto.DosageId, dto.PackagingId, dto.OriginCountryId, dto.CustomsRegimeId, cancellationToken);

        // Regenerate code if country/supplier/warehouse changed
        if (entity.OriginCountryId != dto.OriginCountryId
            || entity.SupplierId != dto.SupplierId
            || entity.WarehouseId != dto.WarehouseId)
        {
            entity.Code = await GenerateCodeAsync(dto.OriginCountryId, dto.SupplierId, dto.WarehouseId, id, cancellationToken);
        }

        entity.Designation = dto.Designation.Trim();
        entity.CipCode = Trim(dto.CipCode);
        entity.ActiveIngredient = Trim(dto.ActiveIngredient);
        entity.WarehouseId = dto.WarehouseId;
        entity.CategoryId = dto.CategoryId;
        entity.TherapeuticClassId = dto.TherapeuticClassId;
        entity.ProductFormId = dto.ProductFormId;
        entity.DosageId = dto.DosageId;
        entity.PackagingId = dto.PackagingId;
        entity.OriginCountryId = dto.OriginCountryId;
        entity.CustomsRegimeId = dto.CustomsRegimeId;
        entity.SupplierId = dto.SupplierId;

        await UpdateAsync(entity, cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await base.GetByIdAsync(id, cancellationToken);
        if (entity is null) return false;

        if (await DbContext.PurchaseLines.AnyAsync(l => l.ProductId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un produit lié à des lignes d'arrivage.");

        if (await DbContext.InvoiceLines.AnyAsync(l => l.ProductId == id, cancellationToken))
            throw new DomainException("Impossible de supprimer un produit lié à des lignes de facture.");

        return await SoftDeleteAsync(id, cancellationToken);
    }

    public Task<bool> RestoreAsync(long id, CancellationToken cancellationToken = default)
        => base.RestoreAsync(id, cancellationToken);

    private async Task<string> GenerateCodeAsync(long? originCountryId, long supplierId, long warehouseId, long? excludeId, CancellationToken ct)
    {
        var countryCode = originCountryId is not null
            ? (await DbContext.Countries.IgnoreQueryFilters().Where(c => c.Id == originCountryId).Select(c => c.IsoCode).FirstOrDefaultAsync(ct) ?? "00")
            : "00";
        var supplierCode = await DbContext.Suppliers.IgnoreQueryFilters().Where(s => s.Id == supplierId).Select(s => s.Code).FirstOrDefaultAsync(ct) ?? "00";
        var warehouseCode = await DbContext.Warehouses.Where(w => w.Id == warehouseId).Select(w => w.Code).FirstOrDefaultAsync(ct) ?? "00";
        var prefix = $"{countryCode}{supplierCode}{warehouseCode}";

        var existingSeqs = await DbSet.IgnoreQueryFilters()
            .Where(p => p.Code.StartsWith(prefix) && (excludeId == null || p.Id != excludeId))
            .Select(p => p.Code)
            .ToListAsync(ct);

        var prefixLen = prefix.Length;
        var maxSeq = existingSeqs
            .Select(c => c.Length > prefixLen && int.TryParse(c[prefixLen..], out var n) ? n : 0)
            .DefaultIfEmpty(0).Max();

        return $"{prefix}{(maxSeq + 1):D3}";
    }

    private async Task ValidateForeignKeysAsync(
        long warehouseId, long categoryId, long therapeuticClassId, long supplierId,
        long? productFormId, long? dosageId, long? packagingId, long? originCountryId, long? customsRegimeId,
        CancellationToken ct)
    {
        if (!await DbContext.Warehouses.AnyAsync(w => w.Id == warehouseId, ct))
            throw new DomainException($"Magasin introuvable (Id={warehouseId}).");
        if (!await DbContext.Categories.AnyAsync(c => c.Id == categoryId, ct))
            throw new DomainException($"Catégorie introuvable (Id={categoryId}).");

        var tc = await DbContext.TherapeuticClasses.FirstOrDefaultAsync(t => t.Id == therapeuticClassId, ct);
        if (tc is null)
            throw new DomainException($"Classe thérapeutique introuvable (Id={therapeuticClassId}).");
        if (tc.CategoryId != categoryId)
            throw new DomainException("La classe thérapeutique n'appartient pas à la catégorie sélectionnée.");

        if (!await DbContext.Suppliers.AnyAsync(s => s.Id == supplierId, ct))
            throw new DomainException($"Fournisseur introuvable (Id={supplierId}).");

        if (productFormId is not null && !await DbContext.ProductForms.AnyAsync(f => f.Id == productFormId, ct))
            throw new DomainException($"Forme pharmaceutique introuvable (Id={productFormId}).");
        if (dosageId is not null && !await DbContext.Dosages.AnyAsync(d => d.Id == dosageId, ct))
            throw new DomainException($"Dosage introuvable (Id={dosageId}).");
        if (packagingId is not null && !await DbContext.Packagings.AnyAsync(p => p.Id == packagingId, ct))
            throw new DomainException($"Conditionnement introuvable (Id={packagingId}).");
        if (originCountryId is not null && !await DbContext.Countries.AnyAsync(c => c.Id == originCountryId, ct))
            throw new DomainException($"Pays d'origine introuvable (Id={originCountryId}).");
        if (customsRegimeId is not null && !await DbContext.CustomsRegimes.AnyAsync(r => r.Id == customsRegimeId, ct))
            throw new DomainException($"Régime douanier introuvable (Id={customsRegimeId}).");
    }

    private static ProductDto ToDto(Product p, int stockQuantity = 0) => new(
        p.Id, p.Code, p.Designation, p.CipCode, p.ActiveIngredient,
        p.WarehouseId, p.Warehouse?.Name,
        p.CategoryId, p.Category?.Name,
        p.TherapeuticClassId, p.TherapeuticClass?.Name,
        p.ProductFormId, p.ProductForm?.Name,
        p.DosageId, p.Dosage?.Name,
        p.PackagingId, p.Packaging?.Name, p.Packaging?.UnitsPerPackaging,
        p.OriginCountryId, p.OriginCountry?.Name,
        p.CustomsRegimeId, p.CustomsRegime?.Name,
        p.SupplierId, p.Supplier?.Name,
        stockQuantity,
        p.IsDeleted,
        p.CreatedAt, p.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
