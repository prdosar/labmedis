namespace LabMedis.Application.Dtos.Categories;

public record CategoryDto(
    long Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
