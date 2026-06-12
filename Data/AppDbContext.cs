using Microsoft.EntityFrameworkCore;
using TravelClick.Models;

namespace TravelClick.Data;

public class AppDbContext : DbContext
{
 public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

 public DbSet<Place> Places => Set<Place>();
 public DbSet<Tag> Tags => Set<Tag>();
 public DbSet<PlaceTag> PlaceTags => Set<PlaceTag>();

 protected override void OnModelCreating(ModelBuilder modelBuilder)
 {
 base.OnModelCreating(modelBuilder);

 modelBuilder.Entity<Place>(entity =>
 {
 entity.ToTable("places");
 entity.HasKey(e => e.Id);

 entity.Property(e => e.LocationNameEnglish).HasColumnName("location_name_english");
 entity.Property(e => e.LocationNameLocal).HasColumnName("location_name_local");
 entity.Property(e => e.Country).HasColumnName("country");
 entity.Property(e => e.City).HasColumnName("city");
 entity.Property(e => e.Description).HasColumnName("description");
 entity.Property(e => e.LocationConfidence).HasColumnName("location_confidence");
 entity.Property(e => e.SourceUrl).HasColumnName("source_url");
 entity.Property(e => e.DateAdded).HasColumnName("date_added");

 entity.Property(e => e.ExtractionId).HasColumnName("extraction_id");
 entity.Property(e => e.Notes).HasColumnName("notes");
 });

 modelBuilder.Entity<Tag>(entity =>
 {
 entity.ToTable("tags");
 entity.HasKey(e => e.Id);
 entity.Property(e => e.Name).HasColumnName("name");
 entity.HasIndex(e => e.Name).IsUnique();
 });

 modelBuilder.Entity<PlaceTag>(entity =>
 {
 entity.ToTable("place_tags");
 entity.HasKey(e => new { e.PlaceId, e.TagId });
 entity.Property(e => e.PlaceId).HasColumnName("place_id");
 entity.Property(e => e.TagId).HasColumnName("tag_id");

 entity.HasOne(e => e.Place)
 .WithMany(p => p.PlaceTags)
 .HasForeignKey(e => e.PlaceId)
 .OnDelete(DeleteBehavior.Cascade);

 entity.HasOne(e => e.Tag)
 .WithMany(t => t.PlaceTags)
 .HasForeignKey(e => e.TagId)
 .OnDelete(DeleteBehavior.Cascade);
 });
 }
}