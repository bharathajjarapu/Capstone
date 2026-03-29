using VenDot.Services;

namespace VenDot.HostedWorkers;

public class ReportBackgroundWorker : BackgroundService
{
    private readonly ReportJobQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReportBackgroundWorker> _logger;

    public ReportBackgroundWorker(ReportJobQueue queue, IServiceScopeFactory scopeFactory, ILogger<ReportBackgroundWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var reportId in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var reportService = scope.ServiceProvider.GetRequiredService<ReportService>();
                    await reportService.ProcessReportAsync(reportId, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Report job failed for {ReportId}", reportId);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
