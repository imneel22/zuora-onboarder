-- Add phase column to customers table
ALTER TABLE public.customers 
ADD COLUMN phase text NOT NULL DEFAULT 'discovery';

-- Add check constraint for valid phases
ALTER TABLE public.customers
ADD CONSTRAINT customers_phase_check 
CHECK (phase IN ('discovery', 'design', 'build', 'test', 'deploy', 'complete'));

-- Update seed data with phases
UPDATE public.customers
SET phase = CASE
  WHEN name = 'Acme Corporation' THEN 'design'
  WHEN name = 'TechStart Industries' THEN 'build'
  WHEN name = 'Global Solutions Inc' THEN 'test'
  WHEN name = 'Innovation Labs' THEN 'discovery'
  ELSE 'discovery'
END;