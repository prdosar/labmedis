namespace LabMedis.Application.Dtos.CustomsRegimes;

public record CustomsRegimeDto(
    long Id,
    string Name,
    string? Code,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
