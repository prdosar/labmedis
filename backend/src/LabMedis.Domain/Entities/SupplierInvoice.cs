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

    public decimal TotalAmountForeign { get; set; }
    public string Currency { get; set; } = "EUR";
    public decimal ExchangeRateToXof { get; set; } = 655.957m;
    public decimal TotalAmountXof { get; private set; }

    public SupplierInvoiceStatus Status { get; private set; } = SupplierInvoiceStatus.NonReglée;
    public decimal AmountPaid { get; private set; } = 0m;
    public decimal BalanceDue => TotalAmountXof - AmountPaid;

    public string? Notes { get; set; }

    public void ComputeXof()
    {
        TotalAmountXof = Math.Round(TotalAmountForeign * ExchangeRateToXof, 2);
    }

    public void RegisterPayment(decimal amount)
    {
        if (amount <= 0)
            throw new DomainException("Le montant du paiement doit être strictement positif.");
        if (amount > BalanceDue + 0.01m)
            throw new DomainException($"Le montant ({amount:N0} XOF) dépasse le solde restant ({BalanceDue:N0} XOF).");

        AmountPaid += amount;
        Status = AmountPaid >= TotalAmountXof - 0.01m
            ? SupplierInvoiceStatus.Réglée
            : SupplierInvoiceStatus.PartReglée;
    }
}
