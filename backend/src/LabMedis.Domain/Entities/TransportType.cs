using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class TransportType : BaseEntity
{
    private readonly List<PurchaseLineTransport> _purchaseLineTransports = new();

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public IReadOnlyCollection<PurchaseLineTransport> PurchaseLineTransports => _purchaseLineTransports;
}
