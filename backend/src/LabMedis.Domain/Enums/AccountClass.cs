namespace LabMedis.Domain.Enums;

public enum AccountClass
{
    Asset = 1,      // Actif
    Liability = 2,  // Passif
    Equity = 3,     // Capitaux propres
    Income = 4,     // Produits (classe 7)
    Expense = 5,    // Charges (classe 6)
    ThirdParty = 6  // Tiers (classe 4)
}
