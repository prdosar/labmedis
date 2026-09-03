namespace LabMedis.Application.Dtos.OperatingExpenses;

public record BudgetVsActuelDto(
    string Categorie,
    decimal Budget,
    decimal Realise,
    decimal Ecart,
    decimal PctConsomme);
