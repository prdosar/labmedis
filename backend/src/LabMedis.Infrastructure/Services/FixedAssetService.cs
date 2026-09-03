using LabMedis.Application.Dtos.FixedAssets;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class FixedAssetService : BaseRepository<FixedAsset>, IFixedAssetService
{
    private readonly ILogger<FixedAssetService> _logger;

    public FixedAssetService(AppDbContext dbContext, ILogger<FixedAssetService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<FixedAssetDto>> GetAllAsync(int page = 1, int size = 20, CancellationToken ct = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(ct);
        var items = await DbSet
            .Include(x => x.Tableau)
            .OrderBy(x => x.Code)
            .Skip(skip).Take(size)
            .ToListAsync(ct);
        return new PagedResult<FixedAssetDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<FixedAssetDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var entity = await DbSet.Include(x => x.Tableau).FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<FixedAssetDto> CreateAsync(FixedAssetCreateDto dto, CancellationToken ct = default)
    {
        ValidateCreateDto(dto.Code, dto.Designation, dto.DureeVieAns, dto.CoutAcquisition, dto.ValeurResiduelle);

        if (await DbSet.AnyAsync(x => x.Code == dto.Code.Trim(), ct))
            throw new DomainException($"Un bien avec le code '{dto.Code}' existe déjà.");

        var tauxLineaire = Math.Round(100m / dto.DureeVieAns, 4);
        var coeff = FixedAsset.CalculerCoefficient(dto.DureeVieAns);

        var entity = new FixedAsset
        {
            Code = dto.Code.Trim(),
            Designation = dto.Designation.Trim(),
            Categorie = dto.Categorie,
            DateAcquisition = dto.DateAcquisition,
            CoutAcquisition = dto.CoutAcquisition,
            ValeurResiduelle = dto.ValeurResiduelle,
            DureeVieAns = dto.DureeVieAns,
            Methode = dto.Methode,
            TauxLineaire = tauxLineaire,
            CoefficientDegressif = coeff,
            Notes = Trim(dto.Notes),
        };

        entity.GenererTableau();
        await CreateAsync(entity, ct);
        _logger.LogInformation("Immobilisation créée Id={Id} Code={Code}", entity.Id, entity.Code);

        var loaded = await DbSet.Include(x => x.Tableau).FirstAsync(x => x.Id == entity.Id, ct);
        return ToDto(loaded);
    }

    public async Task<FixedAssetDto> UpdateAsync(long id, FixedAssetUpdateDto dto, CancellationToken ct = default)
    {
        ValidateCreateDto(dto.Code, dto.Designation, dto.DureeVieAns, dto.CoutAcquisition, dto.ValeurResiduelle);

        var entity = await DbSet.Include(x => x.Tableau).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new DomainException($"Immobilisation introuvable (Id={id}).");

        if (await DbSet.AnyAsync(x => x.Code == dto.Code.Trim() && x.Id != id, ct))
            throw new DomainException($"Un autre bien avec le code '{dto.Code}' existe déjà.");

        entity.Code = dto.Code.Trim();
        entity.Designation = dto.Designation.Trim();
        entity.Categorie = dto.Categorie;
        entity.DateAcquisition = dto.DateAcquisition;
        entity.CoutAcquisition = dto.CoutAcquisition;
        entity.ValeurResiduelle = dto.ValeurResiduelle;
        entity.DureeVieAns = dto.DureeVieAns;
        entity.Methode = dto.Methode;
        entity.TauxLineaire = Math.Round(100m / dto.DureeVieAns, 4);
        entity.CoefficientDegressif = FixedAsset.CalculerCoefficient(dto.DureeVieAns);
        entity.Status = dto.Status;
        entity.Notes = Trim(dto.Notes);

        // Supprimer les lignes existantes et régénérer
        DbContext.DepreciationLines.RemoveRange(entity.Tableau);
        entity.GenererTableau();

        await UpdateAsync(entity, ct);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
        => await SoftDeleteAsync(id, ct);

    public async Task<IReadOnlyList<DepreciationLineDto>> GetTableauAsync(long id, CancellationToken ct = default)
    {
        var entity = await DbSet.Include(x => x.Tableau).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new DomainException($"Immobilisation introuvable (Id={id}).");
        return entity.Tableau.OrderBy(l => l.Annee).Select(ToLineDto).ToList();
    }

    private static void ValidateCreateDto(string code, string designation, int dureeVieAns, decimal cout, decimal residuelle)
    {
        if (string.IsNullOrWhiteSpace(code)) throw new DomainException("Le code est obligatoire.");
        if (string.IsNullOrWhiteSpace(designation)) throw new DomainException("La désignation est obligatoire.");
        if (dureeVieAns <= 0) throw new DomainException("La durée de vie doit être supérieure à 0.");
        if (cout <= 0) throw new DomainException("Le coût d'acquisition doit être positif.");
        if (residuelle < 0) throw new DomainException("La valeur résiduelle ne peut pas être négative.");
        if (residuelle >= cout) throw new DomainException("La valeur résiduelle doit être inférieure au coût d'acquisition.");
    }

    private static FixedAssetDto ToDto(FixedAsset e) => new(
        e.Id,
        e.Code,
        e.Designation,
        e.Categorie.ToString(),
        e.DateAcquisition.ToString("yyyy-MM-dd"),
        e.CoutAcquisition,
        e.ValeurResiduelle,
        e.DureeVieAns,
        e.Methode.ToString(),
        e.TauxLineaire,
        e.CoefficientDegressif,
        e.Status.ToString(),
        e.Notes,
        e.Tableau.OrderBy(l => l.Annee).Select(ToLineDto).ToList(),
        e.CreatedAt,
        e.UpdatedAt);

    private static DepreciationLineDto ToLineDto(DepreciationLine l) => new(
        l.Annee, l.BaseAmortissable, l.DotationAnnuelle, l.CumulAmortissements, l.ValeurNette);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
