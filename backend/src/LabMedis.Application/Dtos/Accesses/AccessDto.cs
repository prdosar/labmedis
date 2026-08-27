namespace LabMedis.Application.Dtos.Accesses;

public record AccessDto(
    long Id,
    string Code,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
