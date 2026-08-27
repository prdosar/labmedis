using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class Customer : BaseEntity
{
    private readonly List<Invoice> _invoices = new();

    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PostalBox { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public long? CountryId { get; set; }
    public string? ContactPerson { get; set; }

    public Country? Country { get; set; }
    public IReadOnlyCollection<Invoice> Invoices => _invoices;
}
