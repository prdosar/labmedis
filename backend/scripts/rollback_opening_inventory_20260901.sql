-- ============================================================
-- ROLLBACK Inventaire d'ouverture LabMedis — 01/09/2026
-- Contrepartie de : seed_opening_inventory_20260901.sql
--
-- Supprime tous les enregistrements créés par l'inventaire d'ouverture
-- du 01/09/2026 (référence LIKE 'INV-OUV-20260901%').
--
-- Ordre imposé par les FK :
--   1) stock_movements  (FK PurchaseLineId Restrict → doit partir avant)
--   2) purchase_lines   (FK PurchaseId → cascade via SELECT sur purchases)
--   3) purchases
--
-- ⚠️  À exécuter UNE SEULE FOIS en prod. La transaction avorte
--     automatiquement si des références client (commandes, livraisons,
--     avoirs, retours) pointent sur les purchase_lines à supprimer.
-- ============================================================

BEGIN;

-- ---------- 1. Aperçu de ce qui sera supprimé ---------------
DO $$
DECLARE
  n_purchases      INT;
  n_purchase_lines INT;
  n_stock_moves    INT;
  n_deliv_refs     INT;
  n_order_refs     INT;
  n_credit_refs    INT;
  n_return_refs    INT;
BEGIN
  SELECT COUNT(*) INTO n_purchases
    FROM purchases WHERE "Reference" LIKE 'INV-OUV-20260901%';

  SELECT COUNT(*) INTO n_purchase_lines
    FROM purchase_lines pl
    JOIN purchases p ON p."Id" = pl."PurchaseId"
    WHERE p."Reference" LIKE 'INV-OUV-20260901%';

  SELECT COUNT(*) INTO n_stock_moves
    FROM stock_movements WHERE "Reference" LIKE 'INV-OUV-20260901%';

  -- Contrôles de sécurité : refs métier sur les lots à supprimer
  SELECT COUNT(*) INTO n_deliv_refs
    FROM delivery_lines dl
    WHERE dl."PurchaseLineId" IN (
      SELECT pl."Id" FROM purchase_lines pl
      JOIN purchases p ON p."Id" = pl."PurchaseId"
      WHERE p."Reference" LIKE 'INV-OUV-20260901%'
    );

  SELECT COUNT(*) INTO n_order_refs
    FROM customer_order_lot_lines col
    WHERE col."PurchaseLineId" IN (
      SELECT pl."Id" FROM purchase_lines pl
      JOIN purchases p ON p."Id" = pl."PurchaseId"
      WHERE p."Reference" LIKE 'INV-OUV-20260901%'
    );

  SELECT COUNT(*) INTO n_credit_refs
    FROM customer_credit_note_lines ccl
    WHERE ccl."PurchaseLineId" IN (
      SELECT pl."Id" FROM purchase_lines pl
      JOIN purchases p ON p."Id" = pl."PurchaseId"
      WHERE p."Reference" LIKE 'INV-OUV-20260901%'
    );

  SELECT COUNT(*) INTO n_return_refs
    FROM supplier_return_lines srl
    WHERE srl."PurchaseLineId" IN (
      SELECT pl."Id" FROM purchase_lines pl
      JOIN purchases p ON p."Id" = pl."PurchaseId"
      WHERE p."Reference" LIKE 'INV-OUV-20260901%'
    );

  RAISE NOTICE 'À supprimer : % purchases, % purchase_lines, % stock_movements',
    n_purchases, n_purchase_lines, n_stock_moves;
  RAISE NOTICE 'Refs métier existantes sur ces lots — delivery_lines: %, customer_order_lot_lines: %, customer_credit_note_lines: %, supplier_return_lines: %',
    n_deliv_refs, n_order_refs, n_credit_refs, n_return_refs;

  IF n_deliv_refs > 0 OR n_order_refs > 0 OR n_credit_refs > 0 OR n_return_refs > 0 THEN
    RAISE EXCEPTION 'Rollback annulé : des références métier existent. Traiter ces enregistrements avant de relancer.';
  END IF;
END $$;

-- ---------- 2. Suppression ---------------
DELETE FROM stock_movements
 WHERE "Reference" LIKE 'INV-OUV-20260901%';

DELETE FROM purchase_lines
 WHERE "PurchaseId" IN (
   SELECT "Id" FROM purchases WHERE "Reference" LIKE 'INV-OUV-20260901%'
 );

DELETE FROM purchases
 WHERE "Reference" LIKE 'INV-OUV-20260901%';

COMMIT;
