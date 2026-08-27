namespace LabMedis.Application.Dtos.CustomerOrders;

public class CustomerStatsDto
{
    public long CustomerId { get; init; }
    public decimal Balance { get; init; }
    public int TotalOrderCount { get; init; }
    public decimal MonthlyRevenueHt { get; init; }
    public decimal MonthlyRevenueTtc { get; init; }
}
