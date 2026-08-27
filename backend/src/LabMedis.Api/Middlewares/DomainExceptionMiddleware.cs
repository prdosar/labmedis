using System.Text.Json;
using LabMedis.Domain.Common;

namespace LabMedis.Api.Middlewares;

public class DomainExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<DomainExceptionMiddleware> _logger;

    public DomainExceptionMiddleware(RequestDelegate next, ILogger<DomainExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Règle métier rejetée sur {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json";
            var payload = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                title = "Règle métier rejetée",
                status = 400,
                detail = ex.Message
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception non gérée sur {Path}", context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";
            var payload = new
            {
                type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                title = "Erreur interne du serveur",
                status = 500,
                detail = ex.Message
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }
}
