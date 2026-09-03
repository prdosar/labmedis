namespace LabMedis.Application.Dtos.GeneralPurchases;

public record GeneralPurchaseDto(
    long Id,
    string DateAchat,
    string? Reference,
    string FournisseurNom,
    string Designation,
    string Categorie,
    decimal MontantHT,
    decimal TauxTVA,
    decimal MontantTTC,
    string ModePaiement,
    bool EstPaye,
    string? DatePaiement,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
