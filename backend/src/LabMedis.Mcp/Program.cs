using LabMedis.Infrastructure.Persistence;
using LabMedis.Mcp.Tools;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

// Aligne le comportement DateTime avec l'API principale (timestamptz PostgreSQL).
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

// Serveur MCP en lecture seule : on n'a besoin que du DbContext (pas des services de commande).
// AsNoTracking par défaut pour toutes les queries — perf + on ne modifie jamais l'état.
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly("LabMedis.Infrastructure"))
     .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)
     .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithTools<ProductsTools>()
    .WithTools<SuppliersTools>()
    .WithTools<CustomersTools>()
    .WithTools<CustomerOrdersTools>()
    .WithTools<SupplierOrdersTools>()
    .WithTools<CustomerInvoicesTools>()
    .WithTools<SupplierInvoicesTools>()
    .WithTools<DeliveriesTools>()
    .WithTools<StockMovementsTools>()
    .WithTools<KpisTools>();

var app = builder.Build();

app.MapMcp();

app.Run();
