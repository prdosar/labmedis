using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

/// <summary>
/// Facture avoir fournisseur — générée automatiquement à chaque arrivage avec des boîtes perdues.
/// Liée à la commande fournisseur et à sa facture d'origine pour le suivi du remboursement.
/// </summary>
public class SupplierCreditNote : BaseEntity
{
    /// <summary>Référence unique : AVOIR-{année}-{séquence}</summary>
    public string Reference { get; set; } = string.Empty;

    /// <summary>Commande fournisseur d'origine — null pour les avoirs issus d'un retour manuel.</summary>
    public long? SupplierOrderId { get; set; }
    public SupplierOrder? SupplierOrder { get; set; }

    /// <summary>Facture fournisseur d'origine (null si l'arrivage précède la réception de facture).</summary>
    public long? SupplierInvoiceId { get; set; }
    public SupplierInvoice? SupplierInvoice { get; set; }

    /// <summary>Arrivage (Purchase) qui a déclenché la création de cet avoir — null pour les retours manuels.</summary>
    public long? PurchaseId { get; set; }
    public Purchase? Purchase { get; set; }

    /// <summary>Retour fournisseur manuel à l'origine de cet avoir — null pour les avoirs de cartons perdus.</summary>
    public long? SupplierReturnId { get; set; }
    public SupplierReturn? SupplierReturn { get; set; }

    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public DateOnly CreditNoteDate { get; set; }

    /// <summary>Valeur FOB des boîtes perdues en devise fournisseur.</summary>
    public decimal AmountForeign { get; set; }

    public string Currency { get; set; } = "EUR";
    public decimal ExchangeRateToXof { get; set; } = 655.957m;

    /// <summary>Valeur FOB des boîtes perdues en XOF.</summary>
    public decimal AmountXof { get; set; }

    /// <summary>Nombre total de boîtes perdues couvertes par cet avoir.</summary>
    public int LostBoxesCount { get; set; }

    public SupplierCreditNoteStatus Status { get; private set; } = SupplierCreditNoteStatus.EnAttente;

    public string? Notes { get; set; }

    /// <summary>Date à laquelle l'avoir a été résolu (remboursé ou remplacé).</summary>
    public DateTime? ResolvedAt { get; private set; }

    public void UpdateStatus(SupplierCreditNoteStatus newStatus, string? notes = null)
    {
        Status = newStatus;
        if (notes is not null)
            Notes = notes;
        if (newStatus == SupplierCreditNoteStatus.Remboursé || newStatus == SupplierCreditNoteStatus.Remplacé)
            ResolvedAt ??= DateTime.UtcNow;
    }
}
