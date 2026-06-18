using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace CentralAuth.Api.Services;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlBody);
}

public class EmailService(IConfiguration cfg) : IEmailService
{
    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var smtp = cfg.GetSection("Smtp");
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(smtp["FromName"], smtp["From"]));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(smtp["Host"], int.Parse(smtp["Port"]!), SecureSocketOptions.Auto);
        await client.AuthenticateAsync(smtp["User"], smtp["Password"]);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
