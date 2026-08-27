namespace LabMedis.Application.Dtos.Dosages;

public record DosageDto(
    long Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
