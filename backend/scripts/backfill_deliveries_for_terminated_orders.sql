-- ============================================================
-- BACKFILL deliveries pour les commandes clôturées (Status=Terminée=2)
-- sans BL en base.
--
-- Contexte : le hook de création automatique de BL dans CompleteAsync
-- a été ajouté après que des commandes aient déjà été clôturées. Ces
-- commandes se retrouvent donc Terminée en base mais sans ligne dans
-- `deliveries`, ce qui rend la page /deliveries et l'outil MCP
-- `list_deliveries` inopérants pour l'historique.
--
-- Ce script insère un BL "coquille" par commande :
--   Reference = 'BL-' || co.Reference   (ex: BL-CMD-2026-001)
--   DeliveryDate = co.OrderDate
--   InvoiceId = co.InvoiceId
--   Status = 'Delivered'                (string, cf. HasConversion<string>)
--   RecipientName, DeliveryAddress = infos client
--
-- ⚠️  Ne crée AUCUNE delivery_line — donc :
--     - pas de risque de re-consommation du stock (déjà consommé
--       au moment original de la clôture)
--     - le BL sera visible dans la liste mais sans détail des lots
-- ============================================================

BEGIN;

-- ---------- 1. Aperçu -----------------------------------------
DO $$
DECLARE
  n_avant       INT;
  n_a_creer     INT;
BEGIN
  SELECT COUNT(*) INTO n_avant
    FROM deliveries WHERE NOT "IsDeleted";

  SELECT COUNT(*) INTO n_a_creer
    FROM customer_orders co
    WHERE NOT co."IsDeleted"
      AND co."Status" = 2
      AND co."InvoiceId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM deliveries d
        WHERE d."InvoiceId" = co."InvoiceId" AND NOT d."IsDeleted"
      );

  RAISE NOTICE 'BL déjà en base (avant)      : %', n_avant;
  RAISE NOTICE 'Commandes à backfiller       : %', n_a_creer;
END $$;

-- ---------- 2. Insertion --------------------------------------
INSERT INTO deliveries (
  "Reference",
  "DeliveryDate",
  "InvoiceId",
  "Status",
  "DeliveryAddress",
  "RecipientName",
  "CarrierName",
  "TrackingNumber",
  "Notes",
  "CreatedAt",
  "UpdatedAt",
  "IsDeleted"
)
SELECT
  'BL-' || co."Reference",
  co."OrderDate",
  co."InvoiceId",
  'Delivered',
  c."Address",
  c."Name",
  NULL,
  NULL,
  'Backfill – BL rétroactif pour commande clôturée avant l''ajout du hook de création automatique',
  NOW(),
  NULL,
  false
FROM customer_orders co
JOIN customers c ON c."Id" = co."CustomerId"
WHERE NOT co."IsDeleted"
  AND co."Status" = 2
  AND co."InvoiceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d."InvoiceId" = co."InvoiceId" AND NOT d."IsDeleted"
  );

-- ---------- 3. Vérification -----------------------------------
DO $$
DECLARE
  n_apres INT;
BEGIN
  SELECT COUNT(*) INTO n_apres FROM deliveries WHERE NOT "IsDeleted";
  RAISE NOTICE 'BL en base (après)           : %', n_apres;
END $$;

COMMIT;
