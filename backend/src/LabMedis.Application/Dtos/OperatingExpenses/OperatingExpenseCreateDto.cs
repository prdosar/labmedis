using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.OperatingExpenses;

public record OperatingExpenseCreateDto(
    DateOnly Date,
    ExpenseCategory Categorie,
    string Description,
    decimal Montant,
    PaymentMethod ModePaiement,
    string? Reference,
    string? Notes);
