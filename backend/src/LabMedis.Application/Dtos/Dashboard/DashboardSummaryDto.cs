namespace LabMedis.Application.Dtos.Dashboard;

/// <summary>
/// KPIs du tableau de bord agrégés sur une période.
/// Les compteurs "all-time" (produits, fournisseurs, clients) ne sont pas filtrés
/// par la période et représentent le total actif dans le référentiel.
/// </summary>
public record DashboardSummaryDto(
    DateOnly DateFrom,
    DateOnly DateTo,
    // Période : Achats (factures fournisseurs reçues, sens comptable SYSCOHADA)
    int SupplierInvoicesCount,
    decimal SupplierInvoicesTotalXof,
    // Période : Ventes (factures clients émises, statut != Draft/Cancelled)
    int SalesCount,
    decimal SalesTotalXof,
    // Période : logistique
    int DeliveriesCount,
    int StockMovementsCount,
    // All-time référentiel
    int ProductsCount,
    int SuppliersCount,
    int CustomersCount);
