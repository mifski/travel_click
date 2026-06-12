using System.Diagnostics;

namespace TravelClick.Services.VideoProcessing;

public class FfmpegFrameExtractor
{
 public async Task<IReadOnlyList<string>> ExtractFramesAsync(string videoPath, int everySeconds = 4, int maxFrames = 6, CancellationToken cancellationToken = default)
 {
 var videoDir = Path.GetDirectoryName(videoPath)!;
 var framesDir = Path.Combine(videoDir, "frames");
 Directory.CreateDirectory(framesDir);

 var outputPattern = Path.Combine(framesDir, "frame_%03d.jpg");

 var psi = new ProcessStartInfo
 {
 FileName = "ffmpeg",
 ArgumentList =
 {
 "-y",
 "-i", videoPath,
 "-vf", $"fps=1/{everySeconds}",
 "-qscale:v", "2",
 outputPattern
 },
 RedirectStandardError = true,
 RedirectStandardOutput = true,
 UseShellExecute = false,
 CreateNoWindow = true,
 };

 using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
 process.Start();

 var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
 var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);

 var timeout = TimeSpan.FromMinutes(1);
 var exitedTask = process.WaitForExitAsync(cancellationToken);
 var completed = await Task.WhenAny(exitedTask, Task.Delay(timeout, cancellationToken));

 if (completed != exitedTask)
 {
 try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
 throw new TimeoutException($"ffmpeg timed out after {timeout.TotalSeconds:n0}s while extracting frames.");
 }

 await exitedTask;
 var error = await stderrTask;
 var output = await stdoutTask;

 if (process.ExitCode != 0)
 {
 throw new InvalidOperationException($"ffmpeg failed with exit code {process.ExitCode}.\nSTDERR: {error}\nSTDOUT: {output}");
 }

 var files = new DirectoryInfo(framesDir)
 .GetFiles("frame_*.jpg")
 .OrderBy(f => f.Name)
 .Take(maxFrames)
 .Select(f => f.FullName)
 .ToList();

 return files;
 }
}
