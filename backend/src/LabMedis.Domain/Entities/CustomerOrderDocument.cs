using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class CustomerOrderDocument : BaseEntity
{
    public long CustomerOrderId { get; set; }
    public CustomerOrder? CustomerOrder { get; set; }

    public string DocumentType { get; set; } = "BonCommande"; // "BonCommande", "Proforma", "Facture", "Autre"
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
}
