using LabMedis.Application.Services;
using LabMedis.Domain.Identity;
using LabMedis.Domain.Repositories;
using LabMedis.Infrastructure.Persistence;
using LabMedis.Infrastructure.Persistence.Seeding;
using LabMedis.Infrastructure.Repositories;
using LabMedis.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LabMedis.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options
                .UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName))
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

        services
            .AddIdentityCore<User>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<Role>()
            .AddRoleManager<RoleManager<Role>>()
            .AddEntityFrameworkStores<AppDbContext>();

        // Repositories
        services.AddScoped<IWarehouseRepository, WarehouseRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITherapeuticClassRepository, TherapeuticClassRepository>();
        services.AddScoped<IProductFormRepository, ProductFormRepository>();
        services.AddScoped<IDosageRepository, DosageRepository>();
        services.AddScoped<IPackagingRepository, PackagingRepository>();
        services.AddScoped<ICountryRepository, CountryRepository>();
        services.AddScoped<ICustomsRegimeRepository, CustomsRegimeRepository>();
        services.AddScoped<ITransportTypeRepository, TransportTypeRepository>();
        services.AddScoped<IAccessRepository, AccessRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IPurchaseRepository, PurchaseRepository>();
        services.AddScoped<IPurchaseLineRepository, PurchaseLineRepository>();
        services.AddScoped<IPurchaseLineTransportRepository, PurchaseLineTransportRepository>();
        services.AddScoped<IInvoiceRepository, InvoiceRepository>();
        services.AddScoped<IInvoiceLineRepository, InvoiceLineRepository>();
        services.AddScoped<IDeliveryRepository, DeliveryRepository>();
        services.AddScoped<IDeliveryLineRepository, DeliveryLineRepository>();
        services.AddScoped<IStockMovementRepository, StockMovementRepository>();
        services.AddScoped<IRoleAccessRepository, RoleAccessRepository>();

        // Services
        services.AddScoped<IAccountingService, AccountingService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITherapeuticClassService, TherapeuticClassService>();
        services.AddScoped<IProductFormService, ProductFormService>();
        services.AddScoped<IDosageService, DosageService>();
        services.AddScoped<IPackagingService, PackagingService>();
        services.AddScoped<ICountryService, CountryService>();
        services.AddScoped<ICustomsRegimeService, CustomsRegimeService>();
        services.AddScoped<ITransportTypeService, TransportTypeService>();
        services.AddScoped<IAccessService, AccessService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IPurchaseService, PurchaseService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IDeliveryService, DeliveryService>();
        services.AddScoped<IStockMovementService, StockMovementService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ICustomerOrderService, CustomerOrderService>();
        services.AddScoped<ISupplierOrderService, SupplierOrderService>();
        services.AddScoped<ICustomerCreditNoteService, CustomerCreditNoteService>();
        services.AddScoped<ISupplierReturnService, SupplierReturnService>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IGeneralPurchaseService, GeneralPurchaseService>();
        services.AddScoped<IOperatingExpenseService, OperatingExpenseService>();
        services.AddScoped<IFixedAssetService, FixedAssetService>();

        return services;
    }

    public static async Task ApplyMigrationsAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(cancellationToken);
        await DataSeeder.SeedAsync(scope.ServiceProvider, cancellationToken);
        await AccountingSeeder.SeedAsync(db);
    }
}
