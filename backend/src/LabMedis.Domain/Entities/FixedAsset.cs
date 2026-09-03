using LabMedis.Domain.Common;
using LabMedis.Domain.Enums;

namespace LabMedis.Domain.Entities;

public class FixedAsset : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public FixedAssetCategory Categorie { get; set; }
    public DateOnly DateAcquisition { get; set; }
    public decimal CoutAcquisition { get; set; }
    public decimal ValeurResiduelle { get; set; }
    public int DureeVieAns { get; set; }
    public DepreciationMethod Methode { get; set; }
    public decimal TauxLineaire { get; set; }       // 100 / DureeVieAns
    public decimal CoefficientDegressif { get; set; } // 1.5 / 2.0 / 2.5 selon SYSCOHADA
    public FixedAssetStatus Status { get; set; } = FixedAssetStatus.EnService;
    public string? Notes { get; set; }

    private readonly List<DepreciationLine> _lines = new();
    public IReadOnlyCollection<DepreciationLine> Tableau => _lines.AsReadOnly();

    public void GenererTableau()
    {
        _lines.Clear();

        var baseAmortissable = CoutAcquisition - ValeurResiduelle;
        var anneeDebut = DateAcquisition.Year;

        if (Methode == DepreciationMethod.Lineaire)
        {
            var dotation = Math.Round(baseAmortissable / DureeVieAns, 2);
            var cumul = 0m;

            for (int i = 0; i < DureeVieAns; i++)
            {
                // Dernière année : ajuster pour éviter erreur d'arrondi
                var dot = (i == DureeVieAns - 1) ? baseAmortissable - cumul : dotation;
                cumul += dot;
                _lines.Add(new DepreciationLine
                {
                    Annee = anneeDebut + i,
                    BaseAmortissable = baseAmortissable,
                    DotationAnnuelle = dot,
                    CumulAmortissements = cumul,
                    ValeurNette = CoutAcquisition - cumul,
                });
            }
        }
        else // Dégressif
        {
            var tauxDegressif = TauxLineaire / 100m * CoefficientDegressif;
            var vnc = baseAmortissable;
            var cumul = 0m;

            for (int i = 0; i < DureeVieAns; i++)
            {
                var anneesRestantes = DureeVieAns - i;
                var dotDegressif = Math.Round(vnc * tauxDegressif, 2);
                var dotLineaire = anneesRestantes > 0 ? Math.Round(vnc / anneesRestantes, 2) : vnc;

                // Bascule en linéaire quand la dotation linéaire dépasse la dégressive
                var dot = dotLineaire > dotDegressif ? dotLineaire : dotDegressif;

                // Dernière année : solder le restant
                if (i == DureeVieAns - 1) dot = vnc;

                cumul += dot;
                vnc -= dot;

                _lines.Add(new DepreciationLine
                {
                    Annee = anneeDebut + i,
                    BaseAmortissable = baseAmortissable,
                    DotationAnnuelle = dot,
                    CumulAmortissements = cumul,
                    ValeurNette = CoutAcquisition - cumul,
                });
            }
        }
    }

    public static decimal CalculerCoefficient(int dureeVieAns) => dureeVieAns switch
    {
        <= 4 => 1.5m,
        <= 6 => 2.0m,
        _ => 2.5m,
    };
}
