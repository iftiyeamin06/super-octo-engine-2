using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddModulePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auth_module_permissions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    PermissionId = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    UpdatedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auth_module_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_auth_module_permissions_auth_modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "auth_modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_auth_module_permissions_auth_permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "auth_permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_auth_module_permissions_ModuleId_PermissionId",
                table: "auth_module_permissions",
                columns: new[] { "ModuleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_auth_module_permissions_PermissionId",
                table: "auth_module_permissions",
                column: "PermissionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_module_permissions");
        }
    }
}
