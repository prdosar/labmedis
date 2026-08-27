using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Country : BaseEntity
{
    private readonly List<Product> _originatingProducts = new();

    public string Name { get; set; } = string.Empty;
    public string? IsoCode { get; set; }
    public string? Description { get; set; }

    public IReadOnlyCollection<Product> OriginatingProducts => _originatingProducts;
}
