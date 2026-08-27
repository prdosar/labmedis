using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LabMedis.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerCodeAndFixProductCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Step 1: Fix product codes — remove underscores ──
            migrationBuilder.Sql(@"
                UPDATE products
                SET ""Code"" = REPLACE(""Code"", '_', '');
            ");

            // ── Step 2: Assign sequential codes to customers (alphabetical order) ──
            migrationBuilder.Sql(@"
                UPDATE customers
                SET ""Code"" = ranked.new_code
                FROM (
                    SELECT ""Id"",
                           LPAD(ROW_NUMBER() OVER (ORDER BY ""Name"")::text, 2, '0') AS new_code
                    FROM customers
                    WHERE ""IsDeleted"" = FALSE
                ) ranked
                WHERE customers.""Id"" = ranked.""Id"";

                -- Soft-deleted customers get a code too (to satisfy NOT NULL later)
                UPDATE customers
                SET ""Code"" = LPAD(""Id""::text, 2, '0')
                WHERE ""Code"" IS NULL;
            ");

            // ── Step 3: Make customer Code NOT NULL with max length 10 ──
            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "customers",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "00",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            // Restore product codes with underscores (best effort — pattern: cc_ss_ww_nnn)
            migrationBuilder.Sql(@"
                UPDATE products
                SET ""Code"" = SUBSTRING(""Code"", 1, 2) || '_' ||
                              SUBSTRING(""Code"", 3, 2) || '_' ||
                              SUBSTRING(""Code"", 5, 2) || '_' ||
                              SUBSTRING(""Code"", 7)
                WHERE LENGTH(""Code"") >= 9;
            ");
        }
    }
}
