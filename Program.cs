using Microsoft.EntityFrameworkCore;
using TravelClick.Data;
using TravelClick.Services;
using TravelClick.Services.VideoProcessing;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// SQLite database in local file places.db (override location with DB_PATH, e.g. a mounted volume)
typeof(AppDbContext).ToString(); // keep using statement
var dbPath = Environment.GetEnvironmentVariable("DB_PATH") ?? "places.db";
var isDev = builder.Environment.IsDevelopment();
builder.Services.AddDbContext<AppDbContext>(options =>
{
 options.UseSqlite($"Data Source={dbPath}");
 if (isDev)
 {
 // Sensitive data logging stays development-only — it writes user data into logs.
 options.EnableDetailedErrors();
 options.EnableSensitiveDataLogging();
 }
});

// Claude settings from environment
var claudeSettings = new ClaudeSettings
{
 ApiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")
 ?? builder.Configuration["Claude:ApiKey"]
 ?? string.Empty,
 Model = builder.Configuration["Claude:Model"] ?? "claude-sonnet-4-6"
};

builder.Services.AddSingleton(claudeSettings);

builder.Services.AddHttpClient();

builder.Services.AddScoped<YtDlpService>();
builder.Services.AddScoped<FfmpegFrameExtractor>();
builder.Services.AddScoped<ClaudeClient>();
builder.Services.AddScoped<PlaceExtractionService>();

// Swagger for API exploring (optional)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Apply migrations / create DB if needed
using (var scope = app.Services.CreateScope())
{
 var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
 // Use migrations to evolve schema safely over time.
 db.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
 app.UseSwagger();
 app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

// Optional shared-secret gate for public deployments: set BACKEND_API_KEY here
// and on the Next.js app, and every /api request must carry it. Without this,
// a deployed backend exposes extraction (and your Anthropic spend) to anyone.
var backendApiKey = Environment.GetEnvironmentVariable("BACKEND_API_KEY");
if (!string.IsNullOrWhiteSpace(backendApiKey))
{
 app.Use(async (ctx, next) =>
 {
 if (ctx.Request.Path.StartsWithSegments("/api") &&
 ctx.Request.Headers["X-Api-Key"] != backendApiKey)
 {
 ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
 await ctx.Response.WriteAsync("Missing or invalid API key.");
 return;
 }
 await next();
 });
}

app.UseAuthorization();

app.MapControllers();

app.Run();
