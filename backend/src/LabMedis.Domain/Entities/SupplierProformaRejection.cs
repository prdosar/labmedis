using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class SupplierProformaRejection : BaseEntity
{
    public long SupplierOrderId { get; set; }
    public SupplierOrder? SupplierOrder { get; set; }

    public string ProformaReference { get; set; } = string.Empty;
    public DateTime RejectedAt { get; set; }
    public string Reason { get; set; } = string.Empty;
}
