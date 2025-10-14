-- Update function to include confidence level breakdown
DROP FUNCTION IF EXISTS get_category_stats(uuid);

CREATE OR REPLACE FUNCTION get_category_stats(p_customer_id uuid)
RETURNS TABLE (
  category text,
  prpc_count bigint,
  subscription_count bigint,
  avg_confidence numeric,
  approval_rate numeric,
  needs_review_count bigint,
  low_confidence_count bigint,
  medium_confidence_count bigint,
  high_confidence_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH prpc_stats AS (
    SELECT 
      COALESCE(inferred_product_category, 'Uncategorized') as cat,
      COUNT(*) as prpc_cnt,
      AVG(confidence) as avg_conf,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100 as approval_pct,
      SUM(CASE WHEN needs_review THEN 1 ELSE 0 END) as review_cnt,
      SUM(CASE WHEN COALESCE(confidence, 0) < 0.4 THEN 1 ELSE 0 END) as low_conf_cnt,
      SUM(CASE WHEN COALESCE(confidence, 0) >= 0.4 AND COALESCE(confidence, 0) < 0.7 THEN 1 ELSE 0 END) as med_conf_cnt,
      SUM(CASE WHEN COALESCE(confidence, 0) >= 0.7 THEN 1 ELSE 0 END) as high_conf_cnt
    FROM prpc_inferences
    WHERE customer_id = p_customer_id
    GROUP BY inferred_product_category
  ),
  sub_stats AS (
    SELECT 
      UNNEST(covers_product_categories) as cat,
      COUNT(*) as sub_cnt
    FROM subscription_coverage_candidates
    WHERE customer_id = p_customer_id
    GROUP BY UNNEST(covers_product_categories)
  )
  SELECT 
    p.cat as category,
    p.prpc_cnt as prpc_count,
    COALESCE(s.sub_cnt, 0) as subscription_count,
    p.avg_conf as avg_confidence,
    p.approval_pct as approval_rate,
    p.review_cnt as needs_review_count,
    p.low_conf_cnt as low_confidence_count,
    p.med_conf_cnt as medium_confidence_count,
    p.high_conf_cnt as high_confidence_count
  FROM prpc_stats p
  LEFT JOIN sub_stats s ON p.cat = s.cat
  ORDER BY p.prpc_cnt DESC;
END;
$$;