-- Add missing fields to prpc_inferences for trust and evidence
ALTER TABLE public.prpc_inferences
ADD COLUMN IF NOT EXISTS evidence_refs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS explanation_vector JSONB,
ADD COLUMN IF NOT EXISTS conflict_flags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- Add missing fields to subscriptions for derivation and trust
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS derivation_trace JSONB,
ADD COLUMN IF NOT EXISTS sot_snapshot_hash TEXT,
ADD COLUMN IF NOT EXISTS conflict_flags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS audited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS audited_at TIMESTAMP WITH TIME ZONE;

-- Add version field to product_category_catalog
ALTER TABLE public.product_category_catalog
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create reconciliation_runs table
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('catalog', 'subscriptions', 'both')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  mismatch_counts JSONB DEFAULT '{}'::jsonb,
  sample_links JSONB DEFAULT '[]'::jsonb,
  delta_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reconciliation_runs
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reconciliation_runs
CREATE POLICY "Anyone can view reconciliation runs"
ON public.reconciliation_runs
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage reconciliation runs"
ON public.reconciliation_runs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prpc_inferences_needs_review ON public.prpc_inferences(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_prpc_inferences_confidence ON public.prpc_inferences(confidence);
CREATE INDEX IF NOT EXISTS idx_subscriptions_confidence ON public.subscriptions(confidence);
CREATE INDEX IF NOT EXISTS idx_subscriptions_audited ON public.subscriptions(audited) WHERE audited = false;
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_customer ON public.reconciliation_runs(customer_id, created_at DESC);