namespace VenDot.Services;

public interface IReportJobQueue
{
    ValueTask EnqueueAsync(int reportId, CancellationToken cancellationToken = default);
}
