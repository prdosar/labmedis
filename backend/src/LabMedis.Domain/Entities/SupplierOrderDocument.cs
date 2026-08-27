using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class SupplierOrderDocument : BaseEntity
{
    public long SupplierOrderId { get; set; }
    public SupplierOrder? SupplierOrder { get; set; }

    public string DocumentType { get; set; } = "Proforma"; // "Proforma", "Facture", "Autre"
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
}
