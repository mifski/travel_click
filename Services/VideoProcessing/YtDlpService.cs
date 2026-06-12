using System.Diagnostics;

namespace TravelClick.Services.VideoProcessing;

public class YtDlpService
{
    public async Task<YtDlpResult> DownloadAsync(string url, CancellationToken cancellationToken = default)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "travelclick", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        // Use a stable output template (id can be missing for some extractors)
        var outputTemplate = Path.Combine(tempDir, "%(id)s.%(ext)s");

        var psi = new ProcessStartInfo
        {
            FileName = "yt-dlp",
            ArgumentList =
            {
                "--write-info-json",
                "--no-playlist",
                // Prefer an mp4 container when possible (common for TikTok). Falls back automatically.
                "-S", "ext:mp4:m4a",
                // NOTE: some platforms are sensitive to user agents. If TikTok starts failing, try:
                // "--user-agent", "Mozilla/5.0 (Windows NT10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                // NOTE (Instagram): if downloads fail due to login/cookies requirements, you can export cookies from your browser.
                // Example (Chrome): yt-dlp --cookies-from-browser chrome --write-info-json -o "..." <url>
                // Uncomment the next two arguments if needed:
                // "--cookies-from-browser",
                // "chrome",
                "-o", outputTemplate,
                url
            },
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        process.Start();

        // Read streams concurrently to avoid deadlocks when buffers fill.
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);

        // Timeout to avoid hanging forever on network/anti-bot stalls.
        var timeout = TimeSpan.FromMinutes(2);
        var exitedTask = process.WaitForExitAsync(cancellationToken);
        var completed = await Task.WhenAny(exitedTask, Task.Delay(timeout, cancellationToken));

        if (completed != exitedTask)
        {
            try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
            throw new TimeoutException($"yt-dlp timed out after {timeout.TotalSeconds:n0}s. TikTok may be throttling/blocking the request. Try enabling cookies-from-browser or a user-agent.");
        }

        await exitedTask;
        var error = await stderrTask;
        var output = await stdoutTask;

        if (process.ExitCode !=0)
        {
            throw new InvalidOperationException($"yt-dlp failed with exit code {process.ExitCode}.\nSTDERR: {error}\nSTDOUT: {output}");
        }

        var dirInfo = new DirectoryInfo(tempDir);
        var videoFile = dirInfo.GetFiles().FirstOrDefault(f => !f.Name.EndsWith(".json", StringComparison.OrdinalIgnoreCase));
        var infoJson = dirInfo.GetFiles("*.info.json").FirstOrDefault();

        if (videoFile == null || infoJson == null)
        {
            throw new InvalidOperationException($"yt-dlp did not produce expected video or info.json files.\nSTDERR: {error}\nSTDOUT: {output}");
        }

        return new YtDlpResult(tempDir, videoFile.FullName, infoJson.FullName);
    }
}

public record YtDlpResult(string WorkDir, string VideoPath, string InfoJsonPath);
