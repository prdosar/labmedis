using LabMedis.Domain.Common;
using LabMedis.Domain.Entities;
using LabMedis.Domain.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LabMedis.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<User, Role, long>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<TherapeuticClass> TherapeuticClasses => Set<TherapeuticClass>();
    public DbSet<ProductForm> ProductForms => Set<ProductForm>();
    public DbSet<Dosage> Dosages => Set<Dosage>();
    public DbSet<Packaging> Packagings => Set<Packaging>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<CustomsRegime> CustomsRegimes => Set<CustomsRegime>();
    public DbSet<TransportType> TransportTypes => Set<TransportType>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseLine> PurchaseLines => Set<PurchaseLine>();
    public DbSet<PurchaseLineTransport> PurchaseLineTransports => Set<PurchaseLineTransport>();
    public DbSet<PurchaseCharge> PurchaseCharges => Set<PurchaseCharge>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<DeliveryLine> DeliveryLines => Set<DeliveryLine>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Access> Accesses => Set<Access>();
    public DbSet<RoleAccess> RoleAccesses => Set<RoleAccess>();
    public DbSet<ChartAccount> ChartAccounts => Set<ChartAccount>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalLine> JournalLines => Set<JournalLine>();
    public DbSet<CustomerOrder> CustomerOrders => Set<CustomerOrder>();
    public DbSet<CustomerOrderLine> CustomerOrderLines => Set<CustomerOrderLine>();
    public DbSet<CustomerOrderLotLine> CustomerOrderLotLines => Set<CustomerOrderLotLine>();
    public DbSet<SupplierOrder> SupplierOrders => Set<SupplierOrder>();
    public DbSet<SupplierOrderLine> SupplierOrderLines => Set<SupplierOrderLine>();
    public DbSet<SupplierOrderDocument> SupplierOrderDocuments => Set<SupplierOrderDocument>();
    public DbSet<CustomerOrderDocument> CustomerOrderDocuments => Set<CustomerOrderDocument>();
    public DbSet<SupplierProformaRejection> SupplierProformaRejections => Set<SupplierProformaRejection>();
    public DbSet<SupplierInvoice> SupplierInvoices => Set<SupplierInvoice>();
    public DbSet<SupplierCreditNote> SupplierCreditNotes => Set<SupplierCreditNote>();
    public DbSet<SupplierReturn> SupplierReturns => Set<SupplierReturn>();
    public DbSet<SupplierReturnLine> SupplierReturnLines => Set<SupplierReturnLine>();
    public DbSet<CustomerCreditNote> CustomerCreditNotes => Set<CustomerCreditNote>();
    public DbSet<CustomerCreditNoteLine> CustomerCreditNoteLines => Set<CustomerCreditNoteLine>();
    public DbSet<InvoicePayment> InvoicePayments => Set<InvoicePayment>();
    public DbSet<SupplierInvoicePayment> SupplierInvoicePayments => Set<SupplierInvoicePayment>();
    public DbSet<GeneralPurchase> GeneralPurchases => Set<GeneralPurchase>();
    public DbSet<OperatingExpense> OperatingExpenses => Set<OperatingExpense>();
    public DbSet<ExpenseBudget> ExpenseBudgets => Set<ExpenseBudget>();
    public DbSet<FixedAsset> FixedAssets => Set<FixedAsset>();
    public DbSet<DepreciationLine> DepreciationLines => Set<DepreciationLine>();
    public DbSet<DeliveryDelay> DeliveryDelays => Set<DeliveryDelay>();
    public DbSet<PaymentDelay> PaymentDelays => Set<PaymentDelay>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // ── ChartAccount ──────────────────────────────────────────
        modelBuilder.Entity<ChartAccount>(b =>
        {
            b.ToTable("chart_accounts");
            b.HasIndex(a => a.Code).IsUnique();
        });

        // ── JournalEntry ─────────────────────────────────────────
        modelBuilder.Entity<JournalEntry>(b =>
        {
            b.ToTable("journal_entries");
            b.HasMany(e => e.Lines)
             .WithOne(l => l.JournalEntry)
             .HasForeignKey(l => l.JournalEntryId)
             .OnDelete(DeleteBehavior.Cascade);
            b.Navigation(e => e.Lines)
             .HasField("_lines")
             .UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        // ── JournalLine ──────────────────────────────────────────
        modelBuilder.Entity<JournalLine>(b =>
        {
            b.ToTable("journal_lines");
            b.Property(l => l.DebitAmount).HasColumnType("numeric(18,2)");
            b.Property(l => l.CreditAmount).HasColumnType("numeric(18,2)");
            b.HasOne(l => l.Account)
             .WithMany()
             .HasForeignKey(l => l.AccountId)
             .OnDelete(DeleteBehavior.Restrict);
            b.HasOne(l => l.Customer)
             .WithMany()
             .HasForeignKey(l => l.CustomerId)
             .OnDelete(DeleteBehavior.SetNull);
            b.HasOne(l => l.Supplier)
             .WithMany()
             .HasForeignKey(l => l.SupplierId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── InvoicePayment ────────────────────────────────────────────
        modelBuilder.Entity<InvoicePayment>(b =>
        {
            b.ToTable("invoice_payments");
            b.Property(p => p.Amount).HasColumnType("numeric(18,2)");
            b.HasOne(p => p.Invoice)
             .WithMany()
             .HasForeignKey(p => p.InvoiceId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SupplierInvoicePayment ────────────────────────────────────
        modelBuilder.Entity<SupplierInvoicePayment>(b =>
        {
            b.ToTable("supplier_invoice_payments");
            b.Property(p => p.Amount).HasColumnType("numeric(18,2)");
            b.HasOne(p => p.SupplierInvoice)
             .WithMany()
             .HasForeignKey(p => p.SupplierInvoiceId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(BuildIsDeletedFilter(entityType.ClrType));
            }
        }
    }

    public override int SaveChanges()
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditAndSoftDelete()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.MarkCreated(now);
                    break;

                case EntityState.Modified:
                    entry.Entity.MarkUpdated(now);
                    break;

                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.SoftDelete(now);
                    break;
            }
        }
    }

    private static System.Linq.Expressions.LambdaExpression BuildIsDeletedFilter(Type entityType)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
        var property = System.Linq.Expressions.Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
        var notDeleted = System.Linq.Expressions.Expression.Equal(property, System.Linq.Expressions.Expression.Constant(false));
        return System.Linq.Expressions.Expression.Lambda(notDeleted, parameter);
    }
}
