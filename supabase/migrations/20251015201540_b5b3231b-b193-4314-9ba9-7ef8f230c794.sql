-- Add product_categories column to use_cases table
ALTER TABLE public.use_cases 
ADD COLUMN IF NOT EXISTS product_categories TEXT[] DEFAULT '{}'::TEXT[];