namespace LabMedis.Application.Dtos.TransportTypes;

public record TransportTypeDto(
    long Id,
    string Code,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
