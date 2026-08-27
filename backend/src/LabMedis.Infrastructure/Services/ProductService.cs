using LabMedis.Application.Dtos.Products;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
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

    public async Task<PagedResult<ProductDto>> GetAllAsync(int page = 1, int size = 10, CancellationToken cancellationToken = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(cancellationToken);
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
            .Skip(skip).Take(size)
            .ToListAsync(cancellationToken);
        return new PagedResult<ProductDto>(items.Select(ToDto).ToList(), total, page, size);
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
        return items.Select(ToDto).ToList();
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
        return item is null ? null : ToDto(item);
    }

    public async Task<ProductDto> CreateAsync(ProductCreateDto dto, CancellationToken cancellationToken = default)
    {
        var code = dto.Code.Trim();
        if (await DbSet.AnyAsync(p => p.Code == code, cancellationToken))
            throw new DomainException($"Un produit avec le code '{code}' existe déjà.");

        await ValidateForeignKeysAsync(dto.WarehouseId, dto.CategoryId, dto.TherapeuticClassId, dto.SupplierId,
            dto.ProductFormId, dto.DosageId, dto.PackagingId, dto.OriginCountryId, dto.CustomsRegimeId, cancellationToken);

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

        var code = dto.Code.Trim();
        if (!string.Equals(entity.Code, code, StringComparison.Ordinal)
            && await DbSet.AnyAsync(p => p.Id != id && p.Code == code, cancellationToken))
            throw new DomainException($"Un autre produit utilise déjà le code '{code}'.");

        await ValidateForeignKeysAsync(dto.WarehouseId, dto.CategoryId, dto.TherapeuticClassId, dto.SupplierId,
            dto.ProductFormId, dto.DosageId, dto.PackagingId, dto.OriginCountryId, dto.CustomsRegimeId, cancellationToken);

        entity.Code = code;
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

    private static ProductDto ToDto(Product p) => new(
        p.Id, p.Code, p.Designation, p.CipCode, p.ActiveIngredient,
        p.WarehouseId, p.Warehouse?.Name,
        p.CategoryId, p.Category?.Name,
        p.TherapeuticClassId, p.TherapeuticClass?.Name,
        p.ProductFormId, p.ProductForm?.Name,
        p.DosageId, p.Dosage?.Name,
        p.PackagingId, p.Packaging?.Name,
        p.OriginCountryId, p.OriginCountry?.Name,
        p.CustomsRegimeId, p.CustomsRegime?.Name,
        p.SupplierId, p.Supplier?.Name,
        p.CreatedAt, p.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
