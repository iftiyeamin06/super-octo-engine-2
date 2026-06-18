using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOtpIsActive_AddCompositeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "auth_otp_verifications");

            migrationBuilder.AlterColumn<string>(
                name: "Purpose",
                table: "auth_otp_verifications",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_auth_otp_verifications_AppUserId_Purpose_CreatedAt",
                table: "auth_otp_verifications",
                columns: new[] { "AppUserId", "Purpose", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_auth_otp_verifications_AppUserId_Purpose_CreatedAt",
                table: "auth_otp_verifications");

            migrationBuilder.AlterColumn<string>(
                name: "Purpose",
                table: "auth_otp_verifications",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "auth_otp_verifications",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }
    }
}
