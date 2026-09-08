-- Grant permissions for supplier delivery note tables
-- Grant basic read access to anon role
GRANT SELECT ON supplier_delivery_notes TO anon;
GRANT SELECT ON supplier_delivery_note_items TO anon;
GRANT SELECT ON delivery_note_invoices TO anon;

-- Grant full access to authenticated role
GRANT ALL PRIVILEGES ON supplier_delivery_notes TO authenticated;
GRANT ALL PRIVILEGES ON supplier_delivery_note_items TO authenticated;
GRANT ALL PRIVILEGES ON delivery_note_invoices TO authenticated;

-- Grant access to related tables
GRANT SELECT ON purchase_orders TO authenticated;
GRANT SELECT ON purchase_order_items TO authenticated;
GRANT SELECT ON suppliers TO authenticated;
GRANT SELECT ON invoices TO authenticated;