using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCodesRefactoring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Step 1: Reassign country IsoCode to sequential numbers (alphabetical order) ──
            migrationBuilder.Sql(@"
                UPDATE countries
                SET ""IsoCode"" = ranked.new_code
                FROM (
                    SELECT ""Id"",
                           LPAD(ROW_NUMBER() OVER (ORDER BY ""Name"")::text, 2, '0') AS new_code
                    FROM countries
                    WHERE ""IsDeleted"" = FALSE
                ) ranked
                WHERE countries.""Id"" = ranked.""Id"";
            ");

            // ── Step 2: Add Code column to suppliers ──
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "suppliers",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            // ── Step 3: Assign sequential codes to suppliers (alphabetical order) ──
            migrationBuilder.Sql(@"
                UPDATE suppliers
                SET ""Code"" = ranked.new_code
                FROM (
                    SELECT ""Id"",
                           LPAD(ROW_NUMBER() OVER (ORDER BY ""Name"")::text, 2, '0') AS new_code
                    FROM suppliers
                    WHERE ""IsDeleted"" = FALSE
                ) ranked
                WHERE suppliers.""Id"" = ranked.""Id"";

                -- Soft-deleted suppliers get a code too (to satisfy NOT NULL later)
                UPDATE suppliers
                SET ""Code"" = LPAD(""Id""::text, 2, '0')
                WHERE ""Code"" IS NULL;
            ");

            // ── Step 4: Make Code NOT NULL ──
            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "suppliers",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "00",
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10,
                oldNullable: true);

            // ── Step 5: Unique index on supplier Code ──
            migrationBuilder.CreateIndex(
                name: "IX_suppliers_Code",
                table: "suppliers",
                column: "Code",
                unique: true);

            // ── Step 6: Reformat existing product codes to new pattern ──
            // Format: countryCode_supplierCode_warehouseCode_seqNr
            // Products without origin country use "00"
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT p.""Id"",
                           COALESCE(c.""IsoCode"", '00') || s.""Code"" || w.""Code"" ||
                           LPAD(
                               ROW_NUMBER() OVER (
                                   PARTITION BY COALESCE(c.""IsoCode"", '00'), s.""Code"", w.""Code""
                                   ORDER BY p.""Id""
                               )::text,
                               3, '0'
                           ) AS new_code
                    FROM products p
                    JOIN suppliers s ON p.""SupplierId"" = s.""Id""
                    JOIN warehouses w ON p.""WarehouseId"" = w.""Id""
                    LEFT JOIN countries c ON p.""OriginCountryId"" = c.""Id""
                )
                UPDATE products
                SET ""Code"" = ranked.new_code
                FROM ranked
                WHERE products.""Id"" = ranked.""Id"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_suppliers_Code",
                table: "suppliers");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "suppliers");

            // Restore product codes to P001 format (best effort)
            migrationBuilder.Sql(@"
                UPDATE products SET ""Code"" = 'P' || LPAD(""Id""::text, 3, '0')
                WHERE TRUE;
            ");
        }
    }
}
