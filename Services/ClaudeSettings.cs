namespace TravelClick.Services;

public class ClaudeSettings
{
 public string ApiKey { get; set; } = string.Empty;
 // Configure a supported model name in appsettings (Claude:Model) or via environment.
 // Default to a currently available model identifier.
 public string Model { get; set; } = "claude-sonnet-4-6";
}