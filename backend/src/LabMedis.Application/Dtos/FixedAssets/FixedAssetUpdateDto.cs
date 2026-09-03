using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.FixedAssets;

public record FixedAssetUpdateDto(
    string Code,
    string Designation,
    FixedAssetCategory Categorie,
    DateOnly DateAcquisition,
    decimal CoutAcquisition,
    decimal ValeurResiduelle,
    int DureeVieAns,
    DepreciationMethod Methode,
    FixedAssetStatus Status,
    string? Notes);
