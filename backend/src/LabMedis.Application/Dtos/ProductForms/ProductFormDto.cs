namespace LabMedis.Application.Dtos.ProductForms;

public record ProductFormDto(
    long Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
