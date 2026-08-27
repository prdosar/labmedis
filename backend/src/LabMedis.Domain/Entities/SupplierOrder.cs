using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class SupplierOrder : BaseEntity
{
    private readonly List<SupplierOrderLine> _lines = new();
    private readonly List<SupplierOrderDocument> _documents = new();

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

    public void MarkConverted()
    {
        Status = SupplierOrderStatus.Convertie;
    }

    public void Cancel()
    {
        if (Status == SupplierOrderStatus.Convertie)
            throw new DomainException("Une commande déjà convertie en arrivage ne peut pas être annulée.");
        Status = SupplierOrderStatus.Annulée;
    }
}
