using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.GeneralPurchases;

public record GeneralPurchaseCreateDto(
    DateOnly DateAchat,
    string? Reference,
    string FournisseurNom,
    string Designation,
    GeneralPurchaseCategory Categorie,
    decimal MontantHT,
    decimal TauxTVA,
    PaymentMethod ModePaiement,
    string? Notes);
