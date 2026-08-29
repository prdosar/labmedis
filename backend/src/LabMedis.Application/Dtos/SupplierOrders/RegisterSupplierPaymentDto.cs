namespace LabMedis.Application.Dtos.SupplierOrders;

public class RegisterSupplierPaymentDto
{
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}
