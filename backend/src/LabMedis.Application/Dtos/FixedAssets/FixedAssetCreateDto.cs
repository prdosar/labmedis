using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.FixedAssets;

public record FixedAssetCreateDto(
    string Code,
    string Designation,
    FixedAssetCategory Categorie,
    DateOnly DateAcquisition,
    decimal CoutAcquisition,
    decimal ValeurResiduelle,
    int DureeVieAns,
    DepreciationMethod Methode,
    string? Notes);
