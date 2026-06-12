using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelClick.Migrations
{
    /// <inheritdoc />
    public partial class AddExtractionIdAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "extraction_id",
                table: "places",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "places",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "extraction_id",
                table: "places");

            migrationBuilder.DropColumn(
                name: "notes",
                table: "places");
        }
    }
}
