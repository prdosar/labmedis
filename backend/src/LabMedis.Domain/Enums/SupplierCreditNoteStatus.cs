namespace LabMedis.Domain.Enums;

public enum SupplierCreditNoteStatus
{
    EnAttente  = 0,  // Généré automatiquement, en attente de confirmation fournisseur
    AvoirReçu  = 1,  // Fournisseur a confirmé l'avoir
    Remboursé  = 2,  // Résolu par remboursement financier
    Remplacé   = 3,  // Résolu par remplacement des produits
    Annulé     = 4,  // Annulé (litige résolu différemment)
}
