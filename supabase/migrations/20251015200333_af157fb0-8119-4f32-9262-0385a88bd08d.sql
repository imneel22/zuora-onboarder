-- Create use_cases table to store use case information
CREATE TABLE IF NOT EXISTS public.use_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  use_case_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  triggering TEXT,
  timing TEXT,
  has_waterfall BOOLEAN NOT NULL DEFAULT false,
  waterfall_file_url TEXT,
  waterfall_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scenarios INTEGER DEFAULT 0,
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view use cases"
  ON public.use_cases
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create use cases"
  ON public.use_cases
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update use cases"
  ON public.use_cases
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete use cases"
  ON public.use_cases
  FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_use_cases_updated_at
  BEFORE UPDATE ON public.use_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for waterfall files
INSERT INTO storage.buckets (id, name, public)
VALUES ('waterfall-files', 'waterfall-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload waterfall files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'waterfall-files');

CREATE POLICY "Anyone can view waterfall files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'waterfall-files');

CREATE POLICY "Anyone can update waterfall files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'waterfall-files');

CREATE POLICY "Anyone can delete waterfall files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'waterfall-files');