using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CentralAuth.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeDeptDesignationRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auth_appusers_auth_departments_DepartmentId",
                table: "auth_appusers");

            migrationBuilder.DropForeignKey(
                name: "FK_auth_appusers_auth_designations_DesignationId",
                table: "auth_appusers");

            // Set existing NULL values to valid defaults before making column required.
            // DeptId=1 (Software Engineering), DesigId=2 (Software Engineer) exist.
            migrationBuilder.Sql("UPDATE auth_appusers SET DesignationId = 2 WHERE DesignationId IS NULL");
            migrationBuilder.Sql("UPDATE auth_appusers SET DepartmentId = 1 WHERE DepartmentId IS NULL");

            migrationBuilder.AlterColumn<long>(
                name: "DesignationId",
                table: "auth_appusers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "DepartmentId",
                table: "auth_appusers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_appusers_auth_departments_DepartmentId",
                table: "auth_appusers",
                column: "DepartmentId",
                principalTable: "auth_departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_appusers_auth_designations_DesignationId",
                table: "auth_appusers",
                column: "DesignationId",
                principalTable: "auth_designations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_auth_appusers_auth_departments_DepartmentId",
                table: "auth_appusers");

            migrationBuilder.DropForeignKey(
                name: "FK_auth_appusers_auth_designations_DesignationId",
                table: "auth_appusers");

            migrationBuilder.AlterColumn<long>(
                name: "DesignationId",
                table: "auth_appusers",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<long>(
                name: "DepartmentId",
                table: "auth_appusers",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddForeignKey(
                name: "FK_auth_appusers_auth_departments_DepartmentId",
                table: "auth_appusers",
                column: "DepartmentId",
                principalTable: "auth_departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_auth_appusers_auth_designations_DesignationId",
                table: "auth_appusers",
                column: "DesignationId",
                principalTable: "auth_designations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
