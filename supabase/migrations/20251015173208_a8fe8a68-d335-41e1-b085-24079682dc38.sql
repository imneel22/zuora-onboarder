-- Create table for custom field configuration
CREATE TABLE public.customer_field_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  include_in_llm BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, field_name)
);

-- Enable RLS
ALTER TABLE public.customer_field_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view field config"
ON public.customer_field_config
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage field config"
ON public.customer_field_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_customer_field_config_updated_at
BEFORE UPDATE ON public.customer_field_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();