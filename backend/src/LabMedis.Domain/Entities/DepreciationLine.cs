using LabMedis.Domain.Common;

namespace LabMedis.Domain.Entities;

public class DepreciationLine : BaseEntity
{
    public long FixedAssetId { get; set; }
    public FixedAsset? FixedAsset { get; set; }

    public int Annee { get; set; }
    public decimal BaseAmortissable { get; set; }
    public decimal DotationAnnuelle { get; set; }
    public decimal CumulAmortissements { get; set; }
    public decimal ValeurNette { get; set; }
}
