using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class SupplierInvoice : BaseEntity
{
    public long SupplierOrderId { get; set; }
    public SupplierOrder? SupplierOrder { get; set; }

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public string InvoiceReference { get; set; } = string.Empty;
    public DateOnly InvoiceDate { get; set; }
    public DateOnly? DueDate { get; set; }

    // Montant brut en devise fournisseur et en XOF
    public decimal TotalAmountForeign { get; set; }
    public string Currency { get; set; } = "EUR";
    public decimal ExchangeRateToXof { get; set; } = 655.957m;
    public decimal TotalAmountXof { get; private set; }

    // Remise accordée par le fournisseur
    public decimal? DiscountAmountForeign { get; set; }
    public decimal DiscountAmountXof { get; private set; }

    // Avance versée au fournisseur
    public decimal? AdvanceAmountForeign { get; set; }
    public decimal AdvanceAmountXof { get; private set; }

    // Montant net = brut − remise
    public decimal NetAmountXof => TotalAmountXof - DiscountAmountXof;

    public SupplierInvoiceStatus Status { get; private set; } = SupplierInvoiceStatus.NonReglée;
    public decimal AmountPaid { get; private set; } = 0m;

    // Solde restant = net − avance − paiements déjà enregistrés
    public decimal BalanceDue => NetAmountXof - AdvanceAmountXof - AmountPaid;

    public string? Notes { get; set; }

    public void ComputeXof()
    {
        TotalAmountXof = Math.Round(TotalAmountForeign * ExchangeRateToXof, 2);

        DiscountAmountXof = DiscountAmountForeign.HasValue
            ? Math.Round(DiscountAmountForeign.Value * ExchangeRateToXof, 2)
            : 0m;

        AdvanceAmountXof = AdvanceAmountForeign.HasValue
            ? Math.Round(AdvanceAmountForeign.Value * ExchangeRateToXof, 2)
            : 0m;
    }

    // Accepte les montants XOF saisis directement par l'utilisateur (arrondi CFA),
    // et recalcule le taux de change depuis TotalAmountXof / TotalAmountForeign.
    public void SetExplicitAmounts(decimal totalXof, decimal? discountXof, decimal? advanceXof)
    {
        TotalAmountXof = totalXof;
        DiscountAmountXof = discountXof ?? 0m;
        AdvanceAmountXof = advanceXof ?? 0m;

        ExchangeRateToXof = TotalAmountForeign > 0
            ? Math.Round(totalXof / TotalAmountForeign, 6)
            : ExchangeRateToXof;
    }

    public void RegisterPayment(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("Le montant du paiement doit être strictement positif.");
        if (amount > BalanceDue + 0.01m)
            throw new DomainException($"Le montant ({amount:N0} XOF) dépasse le solde restant ({BalanceDue:N0} XOF).");

        AmountPaid += amount;
        Status = AmountPaid >= NetAmountXof - AdvanceAmountXof - 0.01m
            ? SupplierInvoiceStatus.Réglée
            : SupplierInvoiceStatus.PartReglée;
    }
}
