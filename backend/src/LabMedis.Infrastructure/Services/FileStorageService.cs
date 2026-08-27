using LabMedis.Application.Services;
using Microsoft.Extensions.Configuration;

namespace LabMedis.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private readonly string _uploadRoot;
    private readonly string _baseUrl;

    public FileStorageService(IConfiguration config)
    {
        _uploadRoot = config["UploadPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        _baseUrl = config["UploadBaseUrl"] ?? "/uploads";
    }

    public async Task<(string RelativePath, string SavedFileName)> SaveAsync(
        Stream content, string subFolder, string originalFileName, CancellationToken ct = default)
    {
        var folder = Path.Combine(_uploadRoot, subFolder);
        Directory.CreateDirectory(folder);

        var ext = Path.GetExtension(originalFileName);
        var savedName = $"{Guid.NewGuid():N}{ext}";
        var relativePath = $"{subFolder}/{savedName}";
        var fullPath = Path.Combine(_uploadRoot, subFolder, savedName);

        await using var fileStream = File.Create(fullPath);
        await content.CopyToAsync(fileStream, ct);

        return (relativePath, savedName);
    }

    public Task DeleteAsync(string relativePath, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_uploadRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string relativePath) => $"{_baseUrl}/{relativePath}";
}
