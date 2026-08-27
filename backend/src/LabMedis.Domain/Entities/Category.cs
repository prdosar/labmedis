using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Category : BaseEntity
{
    private readonly List<TherapeuticClass> _therapeuticClasses = new();
    private readonly List<Product> _products = new();

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public IReadOnlyCollection<TherapeuticClass> TherapeuticClasses => _therapeuticClasses;
    public IReadOnlyCollection<Product> Products => _products;
}
