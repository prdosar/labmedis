namespace LabMedis.Application.Dtos.Products;

public record ProductUpdateDto(
    string Code,
    string Designation,
    string? CipCode,
    string? ActiveIngredient,
    long WarehouseId,
    long CategoryId,
    long TherapeuticClassId,
    long? ProductFormId,
    long? DosageId,
    long? PackagingId,
    long? OriginCountryId,
    long? CustomsRegimeId,
    long SupplierId);
