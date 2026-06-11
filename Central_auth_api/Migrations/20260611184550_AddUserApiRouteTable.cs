using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserApiRouteTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auth_user_api_routes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AppUserId = table.Column<long>(type: "bigint", nullable: false),
                    ApiServiceRouteId = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_user_api_routes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_auth_user_api_routes_auth_api_service_routes_ApiServiceRoute~",
                        column: x => x.ApiServiceRouteId,
                        principalTable: "auth_api_service_routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_auth_user_api_routes_auth_appusers_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "auth_appusers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_auth_user_api_routes_ApiServiceRouteId",
                table: "auth_user_api_routes",
                column: "ApiServiceRouteId");

            migrationBuilder.CreateIndex(
                name: "IX_auth_user_api_routes_AppUserId_ApiServiceRouteId",
                table: "auth_user_api_routes",
                columns: new[] { "AppUserId", "ApiServiceRouteId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_user_api_routes");
        }
    }
}
