namespace LabMedis.Domain.Enums;

public enum SupplierOrderStatus
{
    Brouillon = 0,
    Envoyée = 1,
    ProformaReçue = 2,
    Convertie = 3,       // Obsolète — conservé pour compatibilité données existantes
    Annulée = 4,
    ProformaValidée = 5,
    FactureReçue = 6,
    Réceptionnée = 7,
    EnCoursDeRéception = 8,
}
