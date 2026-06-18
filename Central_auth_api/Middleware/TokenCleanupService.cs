using CentralAuth.Api.Services;

namespace CentralAuth.Api.Middleware;

public class TokenCleanupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<TokenCleanupService> _logger;

    public TokenCleanupService(IServiceProvider services, ILogger<TokenCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
                await tokenService.CleanExpiredTokensAsync();
                _logger.LogInformation("Token cleanup completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token cleanup failed.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
