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
        var host = smtp["Host"] ?? throw new InvalidOperationException("Missing Smtp:Host config.");
        var port = int.Parse(smtp["Port"] ?? "587");
        var user = smtp["User"] ?? throw new InvalidOperationException("Missing Smtp:User config.");
        var password = smtp["Password"] ?? throw new InvalidOperationException("Missing Smtp:Password config.");
        var fromName = smtp["FromName"] ?? "CentralAuth";
        var from = smtp["From"] ?? throw new InvalidOperationException("Missing Smtp:From config.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.Auto);
        await client.AuthenticateAsync(user, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
