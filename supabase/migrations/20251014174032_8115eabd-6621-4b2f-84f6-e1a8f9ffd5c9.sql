-- Update existing PRPC inferences to map old categories to new pricing models
UPDATE prpc_inferences
SET inferred_product_category = CASE 
  WHEN inferred_product_category IN ('Cloud Infrastructure', 'Analytics & BI', 'Data Management') THEN 'Recurring'
  WHEN inferred_product_category IN ('AI & ML', 'Security & Compliance') THEN 'Usage-based'
  WHEN inferred_product_category IN ('Customer Experience', 'Marketing Tech') THEN 'Hybrid'
  WHEN inferred_product_category IN ('Media & Content') THEN 'One-time'
  WHEN inferred_product_category IN ('Communication') THEN 'Tiered'
  ELSE 'Recurring'
END
WHERE inferred_product_category IS NOT NULL;

-- Update subscription coverage candidates to use new pricing models
UPDATE subscription_coverage_candidates
SET covers_product_categories = ARRAY(
  SELECT DISTINCT CASE 
    WHEN cat IN ('Cloud Infrastructure', 'Analytics & BI', 'Data Management') THEN 'Recurring'
    WHEN cat IN ('AI & ML', 'Security & Compliance') THEN 'Usage-based'
    WHEN cat IN ('Customer Experience', 'Marketing Tech') THEN 'Hybrid'
    WHEN cat IN ('Media & Content') THEN 'One-time'
    WHEN cat IN ('Communication') THEN 'Tiered'
    ELSE 'Recurring'
  END
  FROM unnest(covers_product_categories) AS cat
)
WHERE covers_product_categories IS NOT NULL AND array_length(covers_product_categories, 1) > 0;