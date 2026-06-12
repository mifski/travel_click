using System.Text.Json;
using System.Text.Json.Serialization;
using TravelClick.Data;
using TravelClick.Models;
using TravelClick.Services.VideoProcessing;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace TravelClick.Services;

public class PlaceExtractionService
{
 private readonly AppDbContext _db;
 private readonly ClaudeClient _claudeClient;
 private readonly YtDlpService _ytDlp;
 private readonly FfmpegFrameExtractor _ffmpeg;
 private readonly ILogger<PlaceExtractionService> _logger;

 public PlaceExtractionService(AppDbContext db, ClaudeClient claudeClient, YtDlpService ytDlp, FfmpegFrameExtractor ffmpeg, ILogger<PlaceExtractionService> logger)
 {
 _db = db;
 _claudeClient = claudeClient;
 _ytDlp = ytDlp;
 _ffmpeg = ffmpeg;
 _logger = logger;
 }

 private static string NormalizeConfidence(string? value)
 {
 var v = (value ?? string.Empty).Trim().ToLowerInvariant();
 return v switch
 {
 "high" => "high",
 "medium" => "medium",
 "low" => "low",
 _ => "low"
 };
 }

 private static string CanonicalizeTag(string tag)
 {
 // Normalize whitespace and casing, remove leading '#'
 var t = (tag ?? string.Empty).Trim();
 if (t.StartsWith("#")) t = t[1..];
 t = Regex.Replace(t, "\\s+", " ");
 return t.ToLowerInvariant();
 }

 private static string[] NormalizeTags(string[]? tags)
 {
 if (tags == null || tags.Length ==0) return Array.Empty<string>();

 var normalized = new List<string>();
 foreach (var raw in tags)
 {
 var tag = CanonicalizeTag(raw);
 if (string.IsNullOrWhiteSpace(tag)) continue;

 // Guard against junk values that sometimes appear (e.g. "string")
 if (tag is "string" or "null" or "none") continue;

 normalized.Add(tag);
 }

 return normalized.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
 }

 public async Task<IReadOnlyList<Place>> ExtractFromUrlAsync(string url, string? manualCaption, CancellationToken cancellationToken = default)
 {
 // Guardrail: total extraction timeout (avoid requests hanging forever).
 using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
 timeoutCts.CancelAfter(TimeSpan.FromMinutes(4));
 var ct = timeoutCts.Token;

 var swTotal = System.Diagnostics.Stopwatch.StartNew();
 _logger.LogInformation("Extract start: {Url}", url);

 //1. Download video + info.json with yt-dlp
 var sw = System.Diagnostics.Stopwatch.StartNew();
 var yt = await _ytDlp.DownloadAsync(url, ct);
 _logger.LogInformation("yt-dlp done in {ElapsedMs} ms", sw.ElapsedMilliseconds);

 try
 {
 //2. Extract frames via ffmpeg
 sw.Restart();
 var frames = await _ffmpeg.ExtractFramesAsync(yt.VideoPath, cancellationToken: ct);
 _logger.LogInformation("ffmpeg extracted {Count} frames in {ElapsedMs} ms", frames.Count, sw.ElapsedMilliseconds);

 //3. Build caption from info.json + manual caption
 sw.Restart();
 var infoJson = await File.ReadAllTextAsync(yt.InfoJsonPath, ct);
 var info = JsonDocument.Parse(infoJson).RootElement;
 var caption = BuildCaption(info, manualCaption);
 _logger.LogInformation("caption built in {ElapsedMs} ms (len={Len})", sw.ElapsedMilliseconds, caption.Length);

 //4. Call Claude
 sw.Restart();
 var rawJson = await _claudeClient.ExtractLocationJsonAsync(url, caption, frames, ct);
 _logger.LogInformation("Claude done in {ElapsedMs} ms", sw.ElapsedMilliseconds);

 PlaceInput[] parsed;
 try
 {
 // Expect an array for multi-location support
 parsed = JsonSerializer.Deserialize<PlaceInput[]>(rawJson, new JsonSerializerOptions
 {
 PropertyNameCaseInsensitive = true
 }) ?? Array.Empty<PlaceInput>();
 }
 catch (Exception ex)
 {
 _logger.LogError(ex, "Failed to parse Claude JSON: {Json}", rawJson);
 var snippet = rawJson.Length >800 ? rawJson[..800] + "..." : rawJson;
 throw new InvalidOperationException($"Claude did not return valid JSON in expected format. Snippet: {snippet}");
 }

 if (parsed.Length ==0)
 {
 throw new InvalidOperationException("Claude returned empty JSON array.");
 }

 // Ensure source_url is set for every item
 foreach (var p in parsed)
 {
 p.SourceUrl ??= url;
 }

 var saved = await SaveFromClaudeAsync(parsed, ct);
 _logger.LogInformation("Extract end in {ElapsedMs} ms. Saved {Count} places", swTotal.ElapsedMilliseconds, saved.Count);
 return saved;
 }
 finally
 {
 // best-effort cleanup of temp working directory
 try { if (Directory.Exists(yt.WorkDir)) Directory.Delete(yt.WorkDir, recursive: true); }
 catch (Exception ex) { _logger.LogDebug(ex, "Failed to clean up temp dir {Dir}", yt.WorkDir); }
 }
 }

 private static string BuildCaption(JsonElement info, string? manualCaption)
 {
 var parts = new List<string>();
 if (!string.IsNullOrWhiteSpace(manualCaption))
 {
 parts.Add($"Manual caption: {manualCaption}");
 }
 if (info.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String)
 {
 parts.Add($"Original description: {desc.GetString()}");
 }
 if (info.TryGetProperty("title", out var title) && title.ValueKind == JsonValueKind.String)
 {
 parts.Add($"Title: {title.GetString()}");
 }
 if (info.TryGetProperty("uploader", out var uploader) && uploader.ValueKind == JsonValueKind.String)
 {
 parts.Add($"Uploader: {uploader.GetString()}");
 }
 if (info.TryGetProperty("tags", out var tags) && tags.ValueKind == JsonValueKind.Array)
 {
 var tagStrings = tags.EnumerateArray()
 .Where(t => t.ValueKind == JsonValueKind.String)
 .Select(t => t.GetString())
 .Where(s => !string.IsNullOrWhiteSpace(s));
 parts.Add("Hashtags: " + string.Join(", ", tagStrings));
 }

 return string.Join("\n", parts);
 }

 public async Task<IReadOnlyList<Place>> SaveFromClaudeAsync(PlaceInput[] inputs, CancellationToken cancellationToken = default)
 {
 // Keep this overload, but route through the canonical implementation so tags + ExtractionId behave consistently.
 return await SaveFromClaudeAsync(inputs.AsEnumerable(), cancellationToken);
 }

 public async Task<IReadOnlyList<Place>> SaveFromClaudeAsync(IEnumerable<PlaceInput> inputs, CancellationToken cancellationToken = default)
 {
 var list = inputs?.ToList() ?? new List<PlaceInput>();
 if (list.Count ==0) return Array.Empty<Place>();

 // Normalize first so dedupe compares canonical values.
 foreach (var input in list)
 {
 input.LocationNameEnglish ??= string.Empty;
 input.LocationLocal ??= string.Empty;
 input.Country ??= string.Empty;
 input.City ??= string.Empty;
 input.Description ??= string.Empty;
 input.LocationConfidence = NormalizeConfidence(input.LocationConfidence);
 input.SourceUrl ??= string.Empty;
 input.CategoryTags = NormalizeTags(input.CategoryTags);

 if (string.IsNullOrWhiteSpace(input.LocationNameEnglish) || input.LocationConfidence == "low")
 {
 input.LocationNameEnglish = "Unknown";
 }
 }

 // Dedupe exact matches within this extraction run.
 static string KeyFor(PlaceInput i)
 {
 static string Norm(string s) => Regex.Replace((s ?? string.Empty).Trim().ToLowerInvariant(), "\\s+", " ");
 return $"{Norm(i.LocationNameEnglish)}|{Norm(i.Country)}|{Norm(i.City)}";
 }

 var deduped = list
 .GroupBy(KeyFor)
 .Select(g => g.First())
 .ToList();

 // Same ExtractionId for all places produced from this run.
 var extractionId = Guid.NewGuid();

 var places = new List<Place>(deduped.Count);
 foreach (var input in deduped)
 {
 var place = new Place
 {
 LocationNameEnglish = input.LocationNameEnglish,
 LocationNameLocal = input.LocationLocal,
 Country = input.Country,
 City = input.City,
 Description = input.Description,
 LocationConfidence = input.LocationConfidence ?? string.Empty,
 SourceUrl = input.SourceUrl,
 DateAdded = DateTime.UtcNow,
 ExtractionId = extractionId,
 Notes = string.Empty
 };

 // Attach normalized tags
 foreach (var tagName in (input.CategoryTags ?? Array.Empty<string>()).Take(3))
 {
 var canonical = CanonicalizeTag(tagName);
 if (string.IsNullOrWhiteSpace(canonical)) continue;

 // Try to reuse existing tag, otherwise create it.
 var tag = await _db.Tags.FirstOrDefaultAsync(t => t.Name == canonical, cancellationToken);
 if (tag == null)
 {
 tag = new Tag { Name = canonical };
 _db.Tags.Add(tag);

 try
 {
 // Save just the tag so we can safely get its Id and avoid UNIQUE races.
 await _db.SaveChangesAsync(cancellationToken);
 }
 catch (DbUpdateException)
 {
 // Another request likely inserted the same tag concurrently. Detach and re-query.
 _db.Entry(tag).State = EntityState.Detached;
 tag = await _db.Tags.FirstAsync(t => t.Name == canonical, cancellationToken);
 }
 }

 place.PlaceTags.Add(new PlaceTag { Place = place, Tag = tag });
 }

 places.Add(place);
 _db.Places.Add(place);
 }

 try
 {
 await _db.SaveChangesAsync(cancellationToken);
 }
 catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
 {
 var inner = ex.InnerException?.Message ?? ex.Message;
 _logger.LogError(ex, "Failed saving Places to database: {Inner}", inner);
 throw new InvalidOperationException($"Database save failed: {inner}");
 }

 return places;
 }

 // Backwards-compatible single-item save
 public Task<Place> SaveFromClaudeAsync(PlaceInput input, CancellationToken cancellationToken = default)
 {
 return SaveFromClaudeAsync(new[] { input }, cancellationToken).ContinueWith(t => t.Result.First(), cancellationToken);
 }
}

public class PlaceInput
{
 [JsonPropertyName("location_name_english")]
 public string? LocationNameEnglish { get; set; }

 [JsonPropertyName("location_name_local")]
 public string? LocationLocal { get; set; }

 [JsonPropertyName("country")]
 public string? Country { get; set; }

 [JsonPropertyName("city")]
 public string? City { get; set; }

 [JsonPropertyName("category_tags")]
 public string[]? CategoryTags { get; set; }

 [JsonPropertyName("description")]
 public string? Description { get; set; }

 [JsonPropertyName("location_confidence")]
 public string? LocationConfidence { get; set; }

 [JsonPropertyName("source_url")]
 public string? SourceUrl { get; set; }

 [JsonPropertyName("extraction_id")]
 public Guid? ExtractionId { get; set; }

 [JsonPropertyName("notes")]
 public string? Notes { get; set; }
}
