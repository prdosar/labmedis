using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class TherapeuticClass : BaseEntity
{
    private readonly List<Product> _products = new();

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public long CategoryId { get; set; }
    public Category? Category { get; set; }

    public IReadOnlyCollection<Product> Products => _products;
}
