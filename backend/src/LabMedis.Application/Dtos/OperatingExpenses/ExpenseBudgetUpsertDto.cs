using LabMedis.Domain.Enums;

namespace LabMedis.Application.Dtos.OperatingExpenses;

public record ExpenseBudgetUpsertDto(
    int Annee,
    int Mois,
    ExpenseCategory Categorie,
    decimal MontantBudget);
