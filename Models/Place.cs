using System.ComponentModel.DataAnnotations.Schema;

namespace TravelClick.Models;

[Table("places")]
public class Place
{
 public int Id { get; set; }
 public string LocationNameEnglish { get; set; } = string.Empty;
 public string LocationNameLocal { get; set; } = string.Empty;
 public string Country { get; set; } = string.Empty;
 public string City { get; set; } = string.Empty;
 public string Description { get; set; } = string.Empty;
 public string LocationConfidence { get; set; } = string.Empty;
 public string SourceUrl { get; set; } = string.Empty;
 public DateTime DateAdded { get; set; }

 // Groups multiple locations extracted from the same video/extraction run.
 public Guid ExtractionId { get; set; }

 // Optional user notes (free-text).
 public string Notes { get; set; } = string.Empty;

 public ICollection<PlaceTag> PlaceTags { get; set; } = new List<PlaceTag>();
}

[Table("tags")]
public class Tag
{
 public int Id { get; set; }
 public string Name { get; set; } = string.Empty; // canonical (lowercase)

 public ICollection<PlaceTag> PlaceTags { get; set; } = new List<PlaceTag>();
}

[Table("place_tags")]
public class PlaceTag
{
 public int PlaceId { get; set; }
 public Place Place { get; set; } = default!;

 public int TagId { get; set; }
 public Tag Tag { get; set; } = default!;
}