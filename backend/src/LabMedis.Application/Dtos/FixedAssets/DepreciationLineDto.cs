namespace LabMedis.Application.Dtos.FixedAssets;

public record DepreciationLineDto(
    int Annee,
    decimal BaseAmortissable,
    decimal DotationAnnuelle,
    decimal CumulAmortissements,
    decimal ValeurNette);
