namespace LabMedis.Application.Dtos.FixedAssets;

public record FixedAssetDto(
    long Id,
    string Code,
    string Designation,
    string Categorie,
    string DateAcquisition,
    decimal CoutAcquisition,
    decimal ValeurResiduelle,
    int DureeVieAns,
    string Methode,
    decimal TauxLineaire,
    decimal CoefficientDegressif,
    string Status,
    string? Notes,
    IReadOnlyList<DepreciationLineDto> Tableau,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
