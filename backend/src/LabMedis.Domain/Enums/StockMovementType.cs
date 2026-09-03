namespace LabMedis.Domain.Enums;

public enum StockMovementType
{
    PurchaseEntry = 0,
    SaleExit = 1,
    Adjustment = 2,
    Return = 3,
    Loss = 4,
    Transfer = 5,
    SupplierReturn = 6
}
