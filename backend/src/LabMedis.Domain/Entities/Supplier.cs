using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Supplier : BaseEntity
{
    private readonly List<Product> _products = new();
    private readonly List<Purchase> _purchases = new();

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PostalBox { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public long? CountryId { get; set; }
    public string? ContactPerson { get; set; }

    public Country? Country { get; set; }
    public IReadOnlyCollection<Product> Products => _products;
    public IReadOnlyCollection<Purchase> Purchases => _purchases;
}
