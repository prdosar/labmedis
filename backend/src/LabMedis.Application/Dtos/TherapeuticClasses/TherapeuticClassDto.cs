namespace LabMedis.Application.Dtos.TherapeuticClasses;

public record TherapeuticClassDto(
    long Id,
    long CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
