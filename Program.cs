using Microsoft.EntityFrameworkCore;
using TravelClick.Data;
using TravelClick.Services;
using TravelClick.Services.VideoProcessing;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// SQLite database in local file places.db
typeof(AppDbContext).ToString(); // keep using statement
builder.Services.AddDbContext<AppDbContext>(options =>
 options.UseSqlite("Data Source=places.db")
 .EnableDetailedErrors()
 .EnableSensitiveDataLogging());

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

app.UseAuthorization();

app.MapControllers();

app.Run();
