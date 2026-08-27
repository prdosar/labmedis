namespace LabMedis.Application.Dtos.Products;

public record ProductCreateDto(
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
