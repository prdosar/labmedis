namespace LabMedis.Application.Dtos.SupplierOrders;

public record AddPurchaseChargeDto(
    string ChargeType,         // Douane | Fret | TransportLocal | Chargement | Autres
    string Description,
    decimal AmountXof,
    DateOnly ChargeDate,
    string? Reference,
    string DebitAccountCode,   // e.g. "6142" for customs duty
    string CreditAccountCode,  // e.g. "521" for bank, "401" for supplier payable
    string? Notes
);
