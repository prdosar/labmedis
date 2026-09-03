using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class ExpenseBudget : BaseEntity
{
    public int Annee { get; set; }
    public int Mois { get; set; }   // 1-12, ou 0 = budget annuel
    public ExpenseCategory Categorie { get; set; }
    public decimal MontantBudget { get; set; }
}
