using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class SupplierOrder : BaseEntity
{
    private readonly List<SupplierOrderLine> _lines = new();
    private readonly List<SupplierOrderDocument> _documents = new();
    private readonly List<SupplierProformaRejection> _proformaRejections = new();

    public string Reference { get; private set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public long SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public string Currency { get; set; } = "EUR";
    public SupplierOrderStatus Status { get; private set; } = SupplierOrderStatus.Brouillon;
    public string? Notes { get; set; }

    // Proforma info (filled after proforma reception)
    public string? ProformaReference { get; set; }
    public string? ProformaFilePath { get; set; }
    public DateTime? ProformaReceivedAt { get; set; }
    public string? ContainerReference { get; set; }
    public decimal? FreightAmount { get; set; }
    public string? PaymentTerms { get; set; }
    public string? Brand { get; set; }
    public string? Origin { get; set; }
    public DateOnly? ExpectedShippingDate { get; set; }

    public IReadOnlyCollection<SupplierOrderLine> Lines => _lines;
    public IReadOnlyCollection<SupplierOrderDocument> Documents => _documents;
    public IReadOnlyCollection<SupplierProformaRejection> ProformaRejections => _proformaRejections;

    // Navigation : une seule facture par commande
    public SupplierInvoice? SupplierInvoice { get; set; }

    public void SetReference(string reference) => Reference = reference;

    public void MarkSent()
    {
        if (Status == SupplierOrderStatus.Brouillon)
            Status = SupplierOrderStatus.Envoyée;
    }

    public void MarkProformaReceived(
        string? proformaRef,
        string? containerRef,
        decimal? freightAmount,
        string? paymentTerms,
        string? brand,
        string? origin,
        DateOnly? expectedShippingDate)
    {
        if (Status == SupplierOrderStatus.Annulée)
            throw new DomainException("Impossible d'enregistrer une proforma sur une commande annulée.");
        if (Status == SupplierOrderStatus.Convertie)
            throw new DomainException("Cette commande a déjà été convertie en arrivage.");
        Status = SupplierOrderStatus.ProformaReçue;
        ProformaReference = proformaRef;
        ProformaReceivedAt = DateTime.UtcNow;
        ContainerReference = containerRef;
        FreightAmount = freightAmount;
        PaymentTerms = paymentTerms;
        Brand = brand;
        Origin = origin;
        ExpectedShippingDate = expectedShippingDate;
    }

    public void ValidateProforma()
    {
        if (Status != SupplierOrderStatus.ProformaReçue)
            throw new DomainException("La proforma ne peut être validée que si la commande est au statut 'Proforma reçue'.");
        Status = SupplierOrderStatus.ProformaValidée;
    }

    public void RejectProforma(string reason)
    {
        if (Status != SupplierOrderStatus.ProformaReçue)
            throw new DomainException("La proforma ne peut être rejetée que si la commande est au statut 'Proforma reçue'.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("La raison du rejet est obligatoire.");

        _proformaRejections.Add(new SupplierProformaRejection
        {
            SupplierOrderId = Id,
            ProformaReference = ProformaReference ?? string.Empty,
            RejectedAt = DateTime.UtcNow,
            Reason = reason.Trim()
        });

        // Retour en brouillon pour renégociation
        Status = SupplierOrderStatus.Brouillon;
        ProformaReference = null;
        ProformaFilePath = null;
        ProformaReceivedAt = null;
    }

    public void MarkInvoiceReceived()
    {
        if (Status != SupplierOrderStatus.ProformaValidée)
            throw new DomainException("La facture ne peut être enregistrée que si la proforma a été validée.");
        Status = SupplierOrderStatus.FactureReçue;
    }

    public void MarkGoodsReceived()
    {
        if (Status != SupplierOrderStatus.FactureReçue && Status != SupplierOrderStatus.EnCoursDeRéception)
            throw new DomainException("La réception des marchandises ne peut se faire qu'après enregistrement de la facture fournisseur.");
        Status = SupplierOrderStatus.EnCoursDeRéception;
    }

    public void CloseReception()
    {
        if (Status != SupplierOrderStatus.EnCoursDeRéception)
            throw new DomainException("La commande doit être en cours de réception pour être clôturée.");
        Status = SupplierOrderStatus.Réceptionnée;
    }

    public void MarkConverted()
    {
        Status = SupplierOrderStatus.Convertie;
    }

    public void Cancel()
    {
        if (Status is SupplierOrderStatus.Réceptionnée or SupplierOrderStatus.Convertie)
            throw new DomainException("Une commande déjà réceptionnée ne peut pas être annulée.");
        Status = SupplierOrderStatus.Annulée;
    }
}
