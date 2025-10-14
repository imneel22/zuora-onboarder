-- Add default pricing model categories
-- First, let's add the new pricing model categories to the catalog

-- Clear existing categories and add pricing model categories
DELETE FROM product_category_catalog;

-- Insert pricing model categories
INSERT INTO product_category_catalog (category_name, pob_name, description, active, version) VALUES
('Recurring', 'Subscription Revenue', 'Monthly or annual subscription-based pricing', true, 1),
('One-time', 'Transaction Revenue', 'Single purchase, one-time payment', true, 1),
('Usage-based', 'Consumption Revenue', 'Metered, pay-per-use pricing', true, 1),
('Hybrid', 'Mixed Revenue', 'Combination of recurring, one-time, and usage-based', true, 1),
('Tiered', 'Tiered Revenue', 'Volume-based pricing tiers', true, 1),
('Freemium', 'Freemium Revenue', 'Free tier with paid upgrades', true, 1);