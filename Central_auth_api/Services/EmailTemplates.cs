namespace CentralAuth.Api.Services;

public static class EmailTemplates
{
    public static string GetVerificationEmail(string firstName, string otp, string verificationLink)
    {
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Verify Your Email</title>
</head>
<body style=""margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"">
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f4f5;padding:40px 16px;"">
<tr><td align=""center"">
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:480px;"">

<!-- Logo -->
<tr><td align=""center"" style=""padding-bottom:32px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#4F46E5;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;"">
<span style=""color:#fff;font-size:18px;font-weight:bold;line-height:40px;"">C</span>
</td>
</tr></table>
<p style=""margin:8px 0 0;color:#18181b;font-size:18px;font-weight:700;"">CentralAuth</p>
</td></tr>

<!-- Card -->
<tr><td style=""background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px 24px;"">

<h1 style=""margin:0 0 8px;color:#18181b;font-size:20px;font-weight:600;text-align:center;"">Verify your email</h1>
<p style=""margin:0 0 24px;color:#71717a;font-size:14px;text-align:center;"">Hi {System.Net.WebUtility.HtmlEncode(firstName)}, please verify your email address to get started.</p>

<!-- Verify Button -->
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr><td align=""center"" style=""padding-bottom:24px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#4F46E5;border-radius:8px;"">
<a href=""{verificationLink}"" style=""display:inline-block;padding:12px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;"">Verify Email Address</a>
</td>
</tr></table>
</td></tr></table>

<!-- Divider -->
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr>
<td style=""border-top:1px solid #e4e4e7;padding:0;""></td>
</tr></table>

<!-- OTP Section -->
<p style=""margin:24px 0 12px;color:#18181b;font-size:14px;font-weight:600;text-align:center;"">Or enter this code manually</p>
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr><td align=""center"" style=""padding-bottom:20px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:10px 24px;"">
<span style=""font-family:'SF Mono',Consolas,monospace;font-size:22px;font-weight:700;color:#18181b;letter-spacing:4px;"">{otp}</span>
</td>
</tr></table>
</td></tr></table>

<p style=""margin:0;color:#a1a1aa;font-size:12px;text-align:center;"">This code expires in <strong style=""color:#71717a;"">10 minutes</strong>.</p>

</td></tr>

<!-- Footer -->
<tr><td style=""padding:24px 0 0;"">
<p style=""margin:0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.6;"">
This link expires in <strong style=""color:#71717a;"">24 hours</strong>.<br>
If you didn't request this, you can safely ignore this email.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>";
    }

    public static string GetPasswordResetEmail(string firstName, string otp, string resetLink)
    {
        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Reset Your Password</title>
</head>
<body style=""margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"">
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f4f5;padding:40px 16px;"">
<tr><td align=""center"">
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:480px;"">

<!-- Logo -->
<tr><td align=""center"" style=""padding-bottom:32px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#4F46E5;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;"">
<span style=""color:#fff;font-size:18px;font-weight:bold;line-height:40px;"">C</span>
</td>
</tr></table>
<p style=""margin:8px 0 0;color:#18181b;font-size:18px;font-weight:700;"">CentralAuth</p>
</td></tr>

<!-- Card -->
<tr><td style=""background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px 24px;"">

<h1 style=""margin:0 0 8px;color:#18181b;font-size:20px;font-weight:600;text-align:center;"">Reset your password</h1>
<p style=""margin:0 0 24px;color:#71717a;font-size:14px;text-align:center;"">Hi {System.Net.WebUtility.HtmlEncode(firstName)}, we received a request to reset your password.</p>

<!-- Reset Button -->
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr><td align=""center"" style=""padding-bottom:24px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#4F46E5;border-radius:8px;"">
<a href=""{resetLink}"" style=""display:inline-block;padding:12px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;"">Reset Password</a>
</td>
</tr></table>
</td></tr></table>

<!-- Divider -->
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr>
<td style=""border-top:1px solid #e4e4e7;padding:0;""></td>
</tr></table>

<!-- OTP Section -->
<p style=""margin:24px 0 12px;color:#18181b;font-size:14px;font-weight:600;text-align:center;"">Or enter this code manually</p>
<table width=""100%"" cellpadding=""0"" cellspacing=""0""><tr><td align=""center"" style=""padding-bottom:20px;"">
<table cellpadding=""0"" cellspacing=""0""><tr>
<td style=""background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:10px 24px;"">
<span style=""font-family:'SF Mono',Consolas,monospace;font-size:22px;font-weight:700;color:#18181b;letter-spacing:4px;"">{otp}</span>
</td>
</tr></table>
</td></tr></table>

<p style=""margin:0;color:#a1a1aa;font-size:12px;text-align:center;"">This code expires in <strong style=""color:#71717a;"">10 minutes</strong>.</p>

</td></tr>

<!-- Footer -->
<tr><td style=""padding:24px 0 0;"">
<p style=""margin:0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.6;"">
This link expires in <strong style=""color:#71717a;"">24 hours</strong>.<br>
If you didn't request this, you can safely ignore this email. Your password will not be changed.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>";
    }
}
