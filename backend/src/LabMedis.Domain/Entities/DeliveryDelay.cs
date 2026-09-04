using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class DeliveryDelay : BaseEntity
{
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
