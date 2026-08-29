namespace LabMedis.Application.Dtos.Invoices;

public class RegisterPaymentDto
{
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
}
