using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class OperatingExpense : BaseEntity
{
    public DateOnly Date { get; set; }
    public ExpenseCategory Categorie { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Montant { get; set; }
    public PaymentMethod ModePaiement { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}
