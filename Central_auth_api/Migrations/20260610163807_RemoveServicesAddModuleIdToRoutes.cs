using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveServicesAddModuleIdToRoutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auth_api_service_routes_auth_services_ServiceId",
                table: "auth_api_service_routes");

            migrationBuilder.DropForeignKey(
                name: "FK_auth_audithistories_auth_services_ServiceId",
                table: "auth_audithistories");

            migrationBuilder.DropForeignKey(
                name: "FK_auth_user_claims_auth_appusers_AppUserId",
                table: "auth_user_claims");

            migrationBuilder.DropTable(
                name: "auth_service_api_keys");

            migrationBuilder.DropTable(
                name: "auth_services");

            migrationBuilder.DropIndex(
                name: "IX_auth_audithistories_ServiceId",
                table: "auth_audithistories");

            migrationBuilder.DropIndex(
                name: "IX_auth_api_service_routes_ServiceId",
                table: "auth_api_service_routes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_auth_user_claims",
                table: "auth_user_claims");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "auth_audithistories");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "auth_api_service_routes");

            migrationBuilder.RenameTable(
                name: "auth_user_claims",
                newName: "UserClaims");

            migrationBuilder.RenameIndex(
                name: "IX_auth_user_claims_AppUserId",
                table: "UserClaims",
                newName: "IX_UserClaims_AppUserId");

            migrationBuilder.AddColumn<long>(
                name: "ModuleId",
                table: "auth_api_service_routes",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserClaims",
                table: "UserClaims",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_auth_api_service_routes_ModuleId",
                table: "auth_api_service_routes",
                column: "ModuleId");

            migrationBuilder.AddForeignKey(
                name: "FK_auth_api_service_routes_auth_modules_ModuleId",
                table: "auth_api_service_routes",
                column: "ModuleId",
                principalTable: "auth_modules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserClaims_auth_appusers_AppUserId",
                table: "UserClaims",
                column: "AppUserId",
                principalTable: "auth_appusers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auth_api_service_routes_auth_modules_ModuleId",
                table: "auth_api_service_routes");

            migrationBuilder.DropForeignKey(
                name: "FK_UserClaims_auth_appusers_AppUserId",
                table: "UserClaims");

            migrationBuilder.DropIndex(
                name: "IX_auth_api_service_routes_ModuleId",
                table: "auth_api_service_routes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserClaims",
                table: "UserClaims");

            migrationBuilder.DropColumn(
                name: "ModuleId",
                table: "auth_api_service_routes");

            migrationBuilder.RenameTable(
                name: "UserClaims",
                newName: "auth_user_claims");

            migrationBuilder.RenameIndex(
                name: "IX_UserClaims_AppUserId",
                table: "auth_user_claims",
                newName: "IX_auth_user_claims_AppUserId");

            migrationBuilder.AddColumn<long>(
                name: "ServiceId",
                table: "auth_audithistories",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ServiceId",
                table: "auth_api_service_routes",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_auth_user_claims",
                table: "auth_user_claims",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "auth_services",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BaseUrl = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_services", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "auth_service_api_keys",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ServiceId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    KeyHash = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastUsedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_service_api_keys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_auth_service_api_keys_auth_services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "auth_services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_auth_audithistories_ServiceId",
                table: "auth_audithistories",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_auth_api_service_routes_ServiceId",
                table: "auth_api_service_routes",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_auth_service_api_keys_KeyHash",
                table: "auth_service_api_keys",
                column: "KeyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_auth_service_api_keys_ServiceId",
                table: "auth_service_api_keys",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_auth_services_Code",
                table: "auth_services",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_api_service_routes_auth_services_ServiceId",
                table: "auth_api_service_routes",
                column: "ServiceId",
                principalTable: "auth_services",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_audithistories_auth_services_ServiceId",
                table: "auth_audithistories",
                column: "ServiceId",
                principalTable: "auth_services",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_user_claims_auth_appusers_AppUserId",
                table: "auth_user_claims",
                column: "AppUserId",
                principalTable: "auth_appusers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
