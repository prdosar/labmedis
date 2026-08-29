using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Packaging : BaseEntity
{
    private readonly List<Product> _products = new();

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Number of sellable units inside one shipping carton for this packaging type.</summary>
    public int UnitsPerPackaging { get; set; } = 1;

    public IReadOnlyCollection<Product> Products => _products;
}
