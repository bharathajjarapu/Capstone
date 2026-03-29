using System.Threading.Channels;

namespace VenDot.Services;

public class ReportJobQueue : IReportJobQueue
{
    private readonly Channel<int> _channel = Channel.CreateUnbounded<int>();

    public async ValueTask EnqueueAsync(int reportId, CancellationToken cancellationToken = default)
    {
        await _channel.Writer.WriteAsync(reportId, cancellationToken);
    }

    public ChannelReader<int> Reader => _channel.Reader;
}
