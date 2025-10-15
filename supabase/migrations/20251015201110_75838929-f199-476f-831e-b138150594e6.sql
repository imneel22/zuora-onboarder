-- Create scenarios table to store detailed scenario information
CREATE TABLE IF NOT EXISTS public.use_case_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  use_case_id UUID NOT NULL REFERENCES public.use_cases(id) ON DELETE CASCADE,
  scenario_number INTEGER NOT NULL,
  scenario_name TEXT NOT NULL,
  description TEXT,
  triggering TEXT,
  timing TEXT,
  billing_impact TEXT,
  revenue_recognition TEXT,
  special_handling TEXT,
  example TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.use_case_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view scenarios"
  ON public.use_case_scenarios
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create scenarios"
  ON public.use_case_scenarios
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scenarios"
  ON public.use_case_scenarios
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete scenarios"
  ON public.use_case_scenarios
  FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_use_case_scenarios_updated_at
  BEFORE UPDATE ON public.use_case_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();