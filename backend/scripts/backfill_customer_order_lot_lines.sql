-- ============================================================
-- BACKFILL customer_order_lot_lines pour les commandes clôturées
-- qui ont sauté la préparation (fallback FEFO auto de l'ancien code)
--
-- Reconstruit les lignes de préparation à partir des stock_movements
-- de type SaleExit (=1) référencés par la commande.
--
-- Objectif : que le BL affiche à nouveau les N° lots + dates d'expi
-- pour ces commandes clôturées avant la mise en place de la préparation
-- obligatoire.
--
-- ⚠️  Ne modifie aucun stock. Insère uniquement des lignes d'audit.
-- ============================================================

BEGIN;

-- ---------- 1. Aperçu ---------------
DO $$
DECLARE
  n_orders     INT;
  n_movements  INT;
  n_lines_to_insert INT;
BEGIN
  -- Commandes Terminée (Status=2) sans lot lines
  SELECT COUNT(*) INTO n_orders
    FROM customer_orders co
    WHERE co."Status" = 2
      AND NOT EXISTS (
        SELECT 1 FROM customer_order_lot_lines coll
        WHERE coll."CustomerOrderId" = co."Id" AND coll."IsDeleted" = false
      );

  -- StockMovements SaleExit (Type=1) rattachés à ces commandes
  SELECT COUNT(*) INTO n_movements
    FROM stock_movements sm
    JOIN customer_orders co ON co."Reference" = sm."Reference"
    WHERE sm."MovementType" = 1
      AND co."Status" = 2
      AND NOT EXISTS (
        SELECT 1 FROM customer_order_lot_lines coll
        WHERE coll."CustomerOrderId" = co."Id" AND coll."IsDeleted" = false
      );

  -- Lignes qui seront insérées (join effectif avec customer_order_lines)
  SELECT COUNT(*) INTO n_lines_to_insert
    FROM stock_movements sm
    JOIN customer_orders co ON co."Reference" = sm."Reference"
    JOIN customer_order_lines col ON col."CustomerOrderId" = co."Id"
                                  AND col."ProductId" = sm."ProductId"
                                  AND col."IsDeleted" = false
    WHERE sm."MovementType" = 1
      AND co."Status" = 2
      AND sm."PurchaseLineId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM customer_order_lot_lines coll
        WHERE coll."CustomerOrderId" = co."Id" AND coll."IsDeleted" = false
      );

  RAISE NOTICE 'Commandes Terminée sans lot lines : %', n_orders;
  RAISE NOTICE 'StockMovements SaleExit rattachés : %', n_movements;
  RAISE NOTICE 'Lignes qui seront insérées : %', n_lines_to_insert;

  IF n_movements <> n_lines_to_insert THEN
    RAISE WARNING 'Écart entre movements (%) et lignes à insérer (%) — probable produit sans customer_order_line correspondante.',
      n_movements, n_lines_to_insert;
  END IF;
END $$;

-- ---------- 2. Insertion ---------------
INSERT INTO customer_order_lot_lines (
  "CustomerOrderId",
  "CustomerOrderLineId",
  "ProductId",
  "PurchaseLineId",
  "WarehouseId",
  "QuantityAllocated",
  "CreatedAt",
  "UpdatedAt",
  "IsDeleted"
)
SELECT
  co."Id",
  col."Id",
  sm."ProductId",
  sm."PurchaseLineId",
  sm."WarehouseId",
  ABS(sm."Quantity"),
  NOW(),
  NOW(),
  false
FROM stock_movements sm
JOIN customer_orders co ON co."Reference" = sm."Reference"
JOIN customer_order_lines col ON col."CustomerOrderId" = co."Id"
                              AND col."ProductId" = sm."ProductId"
                              AND col."IsDeleted" = false
WHERE sm."MovementType" = 1
  AND co."Status" = 2
  AND sm."PurchaseLineId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_order_lot_lines coll
    WHERE coll."CustomerOrderId" = co."Id" AND coll."IsDeleted" = false
  );

COMMIT;
