using LabMedis.Application.Dtos.GeneralPurchases;
using LabMedis.Application.Services;
using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabMedis.Infrastructure.Services;

public class GeneralPurchaseService : BaseRepository<GeneralPurchase>, IGeneralPurchaseService
{
    private readonly ILogger<GeneralPurchaseService> _logger;

    public GeneralPurchaseService(AppDbContext dbContext, ILogger<GeneralPurchaseService> logger) : base(dbContext)
    {
        _logger = logger;
    }

    public async Task<PagedResult<GeneralPurchaseDto>> GetAllAsync(int page = 1, int size = 20, CancellationToken ct = default)
    {
        var skip = (page - 1) * size;
        var total = await DbSet.CountAsync(ct);
        var items = await DbSet
            .OrderByDescending(x => x.DateAchat)
            .Skip(skip).Take(size)
            .ToListAsync(ct);
        return new PagedResult<GeneralPurchaseDto>(items.Select(ToDto).ToList(), total, page, size);
    }

    public async Task<GeneralPurchaseDto?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        var entity = await DbSet.FirstOrDefaultAsync(x => x.Id == id, ct);
        return entity is null ? null : ToDto(entity);
    }

    public async Task<GeneralPurchaseDto> CreateAsync(GeneralPurchaseCreateDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.FournisseurNom))
            throw new DomainException("Le nom du fournisseur est obligatoire.");
        if (string.IsNullOrWhiteSpace(dto.Designation))
            throw new DomainException("La désignation est obligatoire.");
        if (dto.MontantHT < 0)
            throw new DomainException("Le montant HT ne peut pas être négatif.");

        var ttc = dto.MontantHT + dto.MontantHT * dto.TauxTVA / 100m;

        var entity = new GeneralPurchase
        {
            DateAchat = dto.DateAchat,
            Reference = Trim(dto.Reference),
            FournisseurNom = dto.FournisseurNom.Trim(),
            Designation = dto.Designation.Trim(),
            Categorie = dto.Categorie,
            MontantHT = dto.MontantHT,
            TauxTVA = dto.TauxTVA,
            MontantTTC = Math.Round(ttc, 2),
            ModePaiement = dto.ModePaiement,
            Notes = Trim(dto.Notes),
        };

        await CreateAsync(entity, ct);
        _logger.LogInformation("Achat général créé Id={Id} Fournisseur={Nom} TTC={TTC}", entity.Id, entity.FournisseurNom, entity.MontantTTC);
        return ToDto(entity);
    }

    public async Task<GeneralPurchaseDto> UpdateAsync(long id, GeneralPurchaseUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await DbSet.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new DomainException($"Achat introuvable (Id={id}).");

        if (string.IsNullOrWhiteSpace(dto.FournisseurNom))
            throw new DomainException("Le nom du fournisseur est obligatoire.");

        entity.DateAchat = dto.DateAchat;
        entity.Reference = Trim(dto.Reference);
        entity.FournisseurNom = dto.FournisseurNom.Trim();
        entity.Designation = dto.Designation.Trim();
        entity.Categorie = dto.Categorie;
        entity.MontantHT = dto.MontantHT;
        entity.TauxTVA = dto.TauxTVA;
        entity.MontantTTC = Math.Round(dto.MontantHT + dto.MontantHT * dto.TauxTVA / 100m, 2);
        entity.ModePaiement = dto.ModePaiement;
        entity.Notes = Trim(dto.Notes);

        await UpdateAsync(entity, ct);
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
        => await SoftDeleteAsync(id, ct);

    public async Task<GeneralPurchaseDto> MarkPaidAsync(long id, DateOnly datePaiement, CancellationToken ct = default)
    {
        var entity = await DbSet.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new DomainException($"Achat introuvable (Id={id}).");

        entity.EstPaye = true;
        entity.DatePaiement = datePaiement;

        await UpdateAsync(entity, ct);
        return ToDto(entity);
    }

    private static GeneralPurchaseDto ToDto(GeneralPurchase e) => new(
        e.Id,
        e.DateAchat.ToString("yyyy-MM-dd"),
        e.Reference,
        e.FournisseurNom,
        e.Designation,
        e.Categorie.ToString(),
        e.MontantHT,
        e.TauxTVA,
        e.MontantTTC,
        e.ModePaiement.ToString(),
        e.EstPaye,
        e.DatePaiement?.ToString("yyyy-MM-dd"),
        e.Notes,
        e.CreatedAt,
        e.UpdatedAt);

    private static string? Trim(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}
