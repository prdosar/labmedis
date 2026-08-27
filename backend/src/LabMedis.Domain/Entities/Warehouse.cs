using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Warehouse : BaseEntity
{
    private readonly List<Product> _products = new();
    private readonly List<StockMovement> _stockMovements = new();

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Notes { get; set; }

    public IReadOnlyCollection<Product> Products => _products;
    public IReadOnlyCollection<StockMovement> StockMovements => _stockMovements;
}
