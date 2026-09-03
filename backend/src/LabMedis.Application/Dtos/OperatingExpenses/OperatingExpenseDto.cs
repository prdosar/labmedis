namespace LabMedis.Application.Dtos.OperatingExpenses;

public record OperatingExpenseDto(
    long Id,
    string Date,
    string Categorie,
    string Description,
    decimal Montant,
    string ModePaiement,
    string? Reference,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
