using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelClick.Data;
using TravelClick.Services;

namespace TravelClick.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ExtractController : ControllerBase
{
 private readonly PlaceExtractionService _service;
 private readonly AppDbContext _db;

 public ExtractController(PlaceExtractionService service, AppDbContext db)
 {
 _service = service;
 _db = db;
 }

 public class ExtractRequest
 {
 public string? Url { get; set; }
 public string? ManualCaption { get; set; }
 }

 [HttpPost]
 public async Task<IActionResult> Extract([FromBody] ExtractRequest? request, CancellationToken cancellationToken)
 {
 if (request == null)
 {
 return BadRequest("Request body is required and must be valid JSON.");
 }

 if (string.IsNullOrWhiteSpace(request.Url))
 {
 return BadRequest("Url is required.");
 }

 try
 {
 var places = await _service.ExtractFromUrlAsync(request.Url, request.ManualCaption, cancellationToken);
 var ids = places.Select(p => p.Id).ToArray();

 var dtos = await _db.Places
 .Where(p => ids.Contains(p.Id))
 .Include(p => p.PlaceTags)
 .ThenInclude(pt => pt.Tag)
 .OrderByDescending(p => p.DateAdded)
 .Select(p => new PlacesController.PlaceDto(
 p.Id,
 p.LocationNameEnglish,
 p.LocationNameLocal,
 p.Country,
 p.City,
 p.PlaceTags.Select(pt => pt.Tag.Name).OrderBy(t => t).ToArray(),
 p.Description,
 p.LocationConfidence,
 p.SourceUrl,
 p.DateAdded,
 p.ExtractionId,
 p.Notes))
 .ToListAsync(cancellationToken);

 return Ok(dtos);
 }
 catch (Exception ex)
 {
 // yt-dlp/ffmpeg/Claude failures should be shown to the user so they can retry with a manual caption.
 return BadRequest(ex.Message);
 }
 }
}