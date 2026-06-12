using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelClick.Migrations
{
    /// <inheritdoc />
    public partial class NormalizedTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "category_tags",
                table: "places");

            migrationBuilder.CreateTable(
                name: "tags",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "place_tags",
                columns: table => new
                {
                    place_id = table.Column<int>(type: "INTEGER", nullable: false),
                    tag_id = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_place_tags", x => new { x.place_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_place_tags_places_place_id",
                        column: x => x.place_id,
                        principalTable: "places",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_place_tags_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_place_tags_tag_id",
                table: "place_tags",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_tags_name",
                table: "tags",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "place_tags");

            migrationBuilder.DropTable(
                name: "tags");

            migrationBuilder.AddColumn<string>(
                name: "category_tags",
                table: "places",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }
    }
}
