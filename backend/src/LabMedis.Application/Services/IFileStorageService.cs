namespace LabMedis.Application.Services;

public interface IFileStorageService
{
    Task<(string RelativePath, string SavedFileName)> SaveAsync(Stream content, string subFolder, string originalFileName, CancellationToken ct = default);
    Task DeleteAsync(string relativePath, CancellationToken ct = default);
    string GetPublicUrl(string relativePath);
}
