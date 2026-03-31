using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VenDot.Migrations
{
    /// <inheritdoc />
    public partial class AddReportName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Reports",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Reports");
        }
    }
}
