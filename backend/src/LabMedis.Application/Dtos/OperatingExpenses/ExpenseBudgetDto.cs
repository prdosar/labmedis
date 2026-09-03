namespace LabMedis.Application.Dtos.OperatingExpenses;

public record ExpenseBudgetDto(
    long Id,
    int Annee,
    int Mois,
    string Categorie,
    decimal MontantBudget);
