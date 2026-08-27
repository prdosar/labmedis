namespace LabMedis.Application.Dtos.Warehouses;

public record WarehouseDto(
    long Id,
    string Code,
    string Name,
    string? Address,
    string? City,
    string? Notes,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
