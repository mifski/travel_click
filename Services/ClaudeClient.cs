using System.Text;
using System.Text.Json;

namespace TravelClick.Services;

public class ClaudeClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ClaudeSettings _settings;
    private readonly ILogger<ClaudeClient> _logger;

    public ClaudeClient(IHttpClientFactory httpClientFactory, ClaudeSettings settings, ILogger<ClaudeClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    private const string Prompt = """
You are a travel location extractor. You will receive video frames (as images) and optionally a video caption.

Your job is to extract location details from what is visible in the frames — read any shop signs, text overlays, street signs, or on-screen location tags. Also use the caption and hashtags if provided.

The video may showcase MULTIPLE distinct locations.

Return ONLY a valid JSON ARRAY. Each array item must be a JSON object with these exact fields:
- location_name_english (string): shop or place name in English
- location_name_local (string): name in the local language/script e.g. Korean, Japanese, Thai. If unknown, return ""
- country (string): country the place is in
- city (string): city or district if identifiable, else ""
- category_tags (array of strings): free-form categories you think apply (e.g. "cafe", "restaurant", "museum", "nature", "shopping", etc.). Prefer short, generic nouns (1-2 words). Return [] if none.
- description (string): 2 sentences max. What makes this place notable.
- location_confidence: "high" if you clearly identified the place, "medium" if inferred, "low" if mostly guessing
- source_url (string): the original URL I will pass you

Rules:
- If truly unable to determine any locations, return an array with a single item where location_name_english is "Unknown" and location_confidence is "low".
- Never guess or hallucinate a place name.
- Do not return anything outside the JSON array. No explanation, no markdown.

Caption (if available): {caption}
Source URL: {url}
""";

    public async Task<string> ExtractLocationJsonAsync(string url, string caption, IReadOnlyList<string> framePaths, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException("Anthropic API key is not set. Configure Claude:ApiKey in appsettings.*.json or set the ANTHROPIC_API_KEY environment variable.");
        }

        var client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri("https://api.anthropic.com");
        client.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        using var content = new StringContent(BuildRequestBody(url, caption, framePaths), Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/v1/messages", content, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Claude API error {Status}: {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Claude API returned {response.StatusCode}: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var contentArray = root.GetProperty("content");

        var textOut = string.Join("\n", contentArray.EnumerateArray()
            .Where(e => e.TryGetProperty("type", out var t) && t.GetString() == "text")
            .Select(e => e.GetProperty("text").GetString())
            .Where(s => !string.IsNullOrWhiteSpace(s)));

        if (string.IsNullOrWhiteSpace(textOut))
        {
            _logger.LogError("Claude response did not contain text content. Raw response: {Body}", body);
            throw new InvalidOperationException("Claude response did not contain text content.");
        }

        var trimmed = StripMarkdownCodeFences(textOut.Trim());

        if (TryParseJson(trimmed, out var parseError) && parseError == null)
        {
            return trimmed;
        }

        var jsonOnly = TryExtractFirstJsonValue(trimmed);
        if (jsonOnly != null && TryParseJson(jsonOnly, out _))
        {
            return jsonOnly;
        }

        var snippet = trimmed.Length > 200 ? trimmed[..200] + "..." : trimmed;
        var extra = parseError != null ? $" ({parseError})" : string.Empty;
        _logger.LogError("Claude did not return valid JSON.{Extra} Snippet: {Snippet}", extra, snippet);
        throw new InvalidOperationException($"Could not extract locations — the AI response was malformed. Try adding a manual caption describing the places shown.");
    }

    private string BuildRequestBody(string url, string caption, IReadOnlyList<string> framePaths)
    {
        var prompt = Prompt
            .Replace("{caption}", caption ?? string.Empty)
            .Replace("{url}", url);

        var contentBlocks = new List<object>
        {
            new { type = "text", text = prompt }
        };

        foreach (var path in framePaths)
        {
            var bytes = File.ReadAllBytes(path);
            var b64 = Convert.ToBase64String(bytes);
            contentBlocks.Add(new
            {
                type = "image",
                source = new
                {
                    type = "base64",
                    media_type = "image/jpeg",
                    data = b64
                }
            });
        }

        var payload = new
        {
            model = _settings.Model,
            max_tokens = 2000,
            temperature = 0,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = contentBlocks
                }
            }
        };

        return JsonSerializer.Serialize(payload);
    }

    private static string? TryExtractFirstJsonValue(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var startObj = text.IndexOf('{');
        var startArr = text.IndexOf('[');
        int start;
        char open;
        char close;

        if (startObj < 0 && startArr < 0) return null;
        if (startObj >= 0 && (startArr < 0 || startObj < startArr))
        {
            start = startObj; open = '{'; close = '}';
        }
        else
        {
            start = startArr; open = '['; close = ']';
        }

        var depth = 0;
        var inString = false;
        var escape = false;

        for (var i = start; i < text.Length; i++)
        {
            var c = text[i];
            if (inString)
            {
                if (escape) { escape = false; continue; }
                if (c == '\\') { escape = true; continue; }
                if (c == '"') inString = false;
                continue;
            }
            if (c == '"') { inString = true; continue; }
            if (c == open) depth++;
            if (c == close)
            {
                depth--;
                if (depth == 0) return text.Substring(start, i - start + 1);
            }
        }

        return null;
    }

    private static bool TryParseJson(string text, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(text)) return false;
        try
        {
            using var _ = JsonDocument.Parse(text);
            return true;
        }
        catch (JsonException ex) { error = ex.Message; return false; }
        catch (Exception ex) { error = ex.Message; return false; }
    }

    private static string StripMarkdownCodeFences(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;
        var t = text.Trim();
        if (t.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewline = t.IndexOf('\n');
            if (firstNewline >= 0) t = t[(firstNewline + 1)..];
            var lastFence = t.LastIndexOf("```", StringComparison.Ordinal);
            if (lastFence >= 0) t = t[..lastFence];
            return t.Trim();
        }
        return t;
    }
}
