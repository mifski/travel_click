using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelClick.Data;
using TravelClick.Models;

namespace TravelClick.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PlacesController : ControllerBase
{
 private readonly AppDbContext _db;

 public PlacesController(AppDbContext db)
 {
 _db = db;
 }

 public record PlaceDto(
 int Id,
 string LocationNameEnglish,
 string LocationNameLocal,
 string Country,
 string City,
 string[] CategoryTags,
 string Description,
 string LocationConfidence,
 string SourceUrl,
 DateTime DateAdded,
 Guid ExtractionId,
 string Notes);

 public record UpsertPlaceRequest(
 string LocationNameEnglish,
 string LocationNameLocal,
 string Country,
 string City,
 string[] CategoryTags,
 string Description,
 string LocationConfidence,
 string SourceUrl,
 Guid ExtractionId,
 string Notes);

 [HttpGet]
 public async Task<ActionResult<IEnumerable<PlaceDto>>> GetPlaces(
 [FromQuery] string? country,
 [FromQuery] string? category,
 [FromQuery] Guid? extractionId,
 [FromQuery] string? q)
 {
 var query = _db.Places.AsQueryable();

 if (extractionId.HasValue && extractionId.Value != Guid.Empty)
 {
 query = query.Where(p => p.ExtractionId == extractionId.Value);
 }

 if (!string.IsNullOrWhiteSpace(country))
 {
 var c = country.Trim().ToLower();
 query = query.Where(p => p.Country.ToLower() == c);
 }

 if (!string.IsNullOrWhiteSpace(q))
 {
 var needle = q.Trim().ToLower();
 query = query.Where(p =>
 p.LocationNameEnglish.ToLower().Contains(needle)
 || p.LocationNameLocal.ToLower().Contains(needle)
 || p.City.ToLower().Contains(needle)
 || p.Country.ToLower().Contains(needle)
 || p.Description.ToLower().Contains(needle)
 || p.Notes.ToLower().Contains(needle));
 }

 // Include tags only after broad filtering
 query = query
 .Include(p => p.PlaceTags)
 .ThenInclude(pt => pt.Tag);

 if (!string.IsNullOrWhiteSpace(category))
 {
 var cat = category.Trim().ToLower();
 query = query.Where(p => p.PlaceTags.Any(pt => pt.Tag.Name == cat));
 }

 var places = await query
 .OrderByDescending(p => p.DateAdded)
 .Select(p => new PlaceDto(
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
 .ToListAsync();

 return Ok(places);
 }

 [HttpPost]
 public async Task<ActionResult<PlaceDto>> CreatePlace([FromBody] UpsertPlaceRequest request)
 {
 var place = new Place
 {
 LocationNameEnglish = request.LocationNameEnglish ?? string.Empty,
 LocationNameLocal = request.LocationNameLocal ?? string.Empty,
 Country = request.Country ?? string.Empty,
 City = request.City ?? string.Empty,
 Description = request.Description ?? string.Empty,
 LocationConfidence = request.LocationConfidence ?? string.Empty,
 SourceUrl = request.SourceUrl ?? string.Empty,
 DateAdded = DateTime.UtcNow,
 ExtractionId = request.ExtractionId == Guid.Empty ? Guid.NewGuid() : request.ExtractionId,
 Notes = request.Notes ?? string.Empty
 };

 await ApplyTagsAsync(place, request.CategoryTags);

 _db.Places.Add(place);
 try
 {
 await _db.SaveChangesAsync();
 }
 catch (DbUpdateException ex)
 {
 var inner = ex.InnerException?.Message ?? ex.Message;
 return BadRequest($"Database save failed: {inner}");
 }

 return Ok(ToDto(place));
 }

 [HttpPut("{id:int}")]
 public async Task<ActionResult<PlaceDto>> UpdatePlace(int id, [FromBody] UpsertPlaceRequest request)
 {
 var place = await _db.Places
 .Include(p => p.PlaceTags)
 .ThenInclude(pt => pt.Tag)
 .FirstOrDefaultAsync(p => p.Id == id);

 if (place == null)
 {
 return NotFound();
 }

 place.LocationNameEnglish = request.LocationNameEnglish ?? string.Empty;
 place.LocationNameLocal = request.LocationNameLocal ?? string.Empty;
 place.Country = request.Country ?? string.Empty;
 place.City = request.City ?? string.Empty;
 place.Description = request.Description ?? string.Empty;
 place.LocationConfidence = request.LocationConfidence ?? string.Empty;
 place.SourceUrl = request.SourceUrl ?? string.Empty;
 place.Notes = request.Notes ?? string.Empty;

 // Keep existing ExtractionId unless provided
 if (request.ExtractionId != Guid.Empty)
 {
 place.ExtractionId = request.ExtractionId;
 }

 await ReplaceTagsAsync(place, request.CategoryTags);

 try
 {
 await _db.SaveChangesAsync();
 }
 catch (DbUpdateException ex)
 {
 var inner = ex.InnerException?.Message ?? ex.Message;
 return BadRequest($"Database save failed: {inner}");
 }

 return Ok(ToDto(place));
 }

 [HttpDelete("{id:int}")]
 public async Task<IActionResult> DeletePlace(int id)
 {
 var place = await _db.Places.FindAsync(id);
 if (place == null)
 {
 return NotFound();
 }

 _db.Places.Remove(place);
 try
 {
 await _db.SaveChangesAsync();
 }
 catch (DbUpdateException ex)
 {
 var inner = ex.InnerException?.Message ?? ex.Message;
 return BadRequest($"Database delete failed: {inner}");
 }

 return NoContent();
 }

 private PlaceDto ToDto(Place p) => new(
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
 p.Notes);

 private async Task ApplyTagsAsync(Place place, string[]? tags)
 {
 var normalized = (tags ?? Array.Empty<string>())
 .Select(t => (t ?? string.Empty).Trim().ToLower())
 .Where(t => !string.IsNullOrWhiteSpace(t))
 .Distinct()
 .ToArray();

 foreach (var name in normalized)
 {
 var tag = await _db.Tags.FirstOrDefaultAsync(t => t.Name == name);
 if (tag == null)
 {
 tag = new Tag { Name = name };
 _db.Tags.Add(tag);
 }
 place.PlaceTags.Add(new PlaceTag { Place = place, Tag = tag });
 }
 }

 private async Task ReplaceTagsAsync(Place place, string[]? tags)
 {
 place.PlaceTags.Clear();
 await ApplyTagsAsync(place, tags);
 }
}