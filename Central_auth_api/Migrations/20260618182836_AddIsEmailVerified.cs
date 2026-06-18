using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsEmailVerified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEmailVerified",
                table: "auth_appusers",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.Sql("UPDATE auth_appusers SET IsEmailVerified = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsEmailVerified",
                table: "auth_appusers");
        }
    }
}
