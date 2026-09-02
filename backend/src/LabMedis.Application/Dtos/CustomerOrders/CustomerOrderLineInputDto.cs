namespace LabMedis.Application.Dtos.CustomerOrders;

public record CustomerOrderLineInputDto(long ProductId, int Quantity, int? QuantityRequested = null, int? UnitsPerCarton = null);
