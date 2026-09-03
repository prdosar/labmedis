using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class GeneralPurchase : BaseEntity
{
    public DateOnly DateAchat { get; set; }
    public string? Reference { get; set; }
    public string FournisseurNom { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public GeneralPurchaseCategory Categorie { get; set; }
    public decimal MontantHT { get; set; }
    public decimal TauxTVA { get; set; } = 18m;
    public decimal MontantTTC { get; set; }
    public PaymentMethod ModePaiement { get; set; }
    public bool EstPaye { get; set; }
    public DateOnly? DatePaiement { get; set; }
    public string? Notes { get; set; }
}
