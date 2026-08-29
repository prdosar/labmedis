namespace LabMedis.Application.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body, string fromName = "LabMedis");
}
