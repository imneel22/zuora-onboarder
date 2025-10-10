-- Update RLS policies to allow public/anonymous access
-- Drop existing restrictive policies and add permissive ones

-- user_roles: Allow anyone to view roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage roles" ON public.user_roles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- profiles: Allow public access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage profiles" ON public.profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- customers: Allow public access
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Standard users can view assigned customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

CREATE POLICY "Anyone can view customers" ON public.customers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage customers" ON public.customers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- product_category_catalog: Allow public access
DROP POLICY IF EXISTS "Admins can view all categories" ON public.product_category_catalog;
DROP POLICY IF EXISTS "Standard users can view categories for assigned customers" ON public.product_category_catalog;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_category_catalog;
DROP POLICY IF EXISTS "Standard users can suggest category changes" ON public.product_category_catalog;

CREATE POLICY "Anyone can view categories" ON public.product_category_catalog FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage categories" ON public.product_category_catalog FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- prpc_inferences: Allow public access
DROP POLICY IF EXISTS "Admins can view all inferences" ON public.prpc_inferences;
DROP POLICY IF EXISTS "Standard users can view inferences for assigned customers" ON public.prpc_inferences;
DROP POLICY IF EXISTS "Users can update inferences for assigned customers" ON public.prpc_inferences;
DROP POLICY IF EXISTS "Admins can manage inferences" ON public.prpc_inferences;

CREATE POLICY "Anyone can view inferences" ON public.prpc_inferences FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage inferences" ON public.prpc_inferences FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- subscriptions: Allow public access
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Standard users can view subscriptions for assigned customers" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions for assigned customers" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Anyone can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- subscription_coverage_candidates: Allow public access
DROP POLICY IF EXISTS "Admins can view all coverage candidates" ON public.subscription_coverage_candidates;
DROP POLICY IF EXISTS "Standard users can view coverage for assigned customers" ON public.subscription_coverage_candidates;
DROP POLICY IF EXISTS "Users can update coverage for assigned customers" ON public.subscription_coverage_candidates;
DROP POLICY IF EXISTS "Admins can manage coverage candidates" ON public.subscription_coverage_candidates;

CREATE POLICY "Anyone can view coverage" ON public.subscription_coverage_candidates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can manage coverage" ON public.subscription_coverage_candidates FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- audit_log: Allow public access
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Standard users can view audit logs for assigned customers" ON public.audit_log;
DROP POLICY IF EXISTS "All users can create audit logs" ON public.audit_log;

CREATE POLICY "Anyone can view audit logs" ON public.audit_log FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Anyone can create audit logs" ON public.audit_log FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Insert seed data

-- Create sample customers
INSERT INTO public.customers (id, name, zuora_account_id, assigned_user_ids, industry, go_live_target_date, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'TechCorp Enterprise', 'ZA-00001', '{}', 'Software', '2025-03-15', 'onboarding'),
  ('22222222-2222-2222-2222-222222222222', 'MediaStream Inc', 'ZA-00002', '{}', 'Media & Entertainment', '2025-04-01', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'FinServe Global', 'ZA-00003', '{}', 'Financial Services', '2025-02-28', 'active');

-- Create product category catalog entries
INSERT INTO public.product_category_catalog (customer_id, category_name, pob_name, description)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'SaaS Licenses', 'Subscription', 'Software as a Service recurring licenses'),
  ('11111111-1111-1111-1111-111111111111', 'Professional Services', 'Time & Materials', 'Consulting and implementation services'),
  ('11111111-1111-1111-1111-111111111111', 'Support & Maintenance', 'Subscription', 'Technical support and maintenance contracts'),
  ('22222222-2222-2222-2222-222222222222', 'Streaming Rights', 'Usage-Based', 'Content streaming licenses'),
  ('22222222-2222-2222-2222-222222222222', 'Content Library', 'Subscription', 'Access to media content library'),
  ('33333333-3333-3333-3333-333333333333', 'Transaction Processing', 'Usage-Based', 'Payment processing services'),
  ('33333333-3333-3333-3333-333333333333', 'Compliance Services', 'Subscription', 'Regulatory compliance management');

-- Create PRPC inferences for TechCorp
INSERT INTO public.prpc_inferences (
  customer_id, prpc_id, product_name, rate_plan_name, charge_name,
  inferred_product_category, inferred_pob, rationale, confidence, source_agent, status
)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'PRPC-1001', 'Enterprise Platform', 'Annual Subscription', 'Platform License Fee',
   'SaaS Licenses', 'Subscription', 'This is a recurring annual software license fee, characteristic of SaaS subscription revenue. The "Annual Subscription" rate plan and "License Fee" terminology clearly indicate a subscription-based performance obligation.', 0.95, 'agent_1b', 'inferred'),
  ('11111111-1111-1111-1111-111111111111', 'PRPC-1002', 'Enterprise Platform', 'Annual Subscription', 'Implementation Fee',
   'Professional Services', 'Time & Materials', 'Implementation fees represent upfront professional services delivered at the start of the contract. The one-time nature and service-oriented description map to Time & Materials POB rather than subscription.', 0.87, 'agent_1b', 'inferred'),
  ('11111111-1111-1111-1111-111111111111', 'PRPC-1003', 'Premium Support', 'Monthly Support Plan', 'Support Fee',
   'Support & Maintenance', 'Subscription', 'Monthly recurring support fee with continuous service delivery. The "Monthly Support Plan" indicates ongoing subscription-based support services.', 0.92, 'agent_1b', 'approved'),
  ('11111111-1111-1111-1111-111111111111', 'PRPC-1004', 'API Access', 'Usage-Based Plan', 'API Call Charges',
   'SaaS Licenses', 'Usage-Based', 'Charges based on actual API consumption. Usage-based pricing tied to transaction volume suggests a consumption-based POB rather than flat subscription.', 0.78, 'agent_1b', 'user_adjusted');

-- Create PRPC inferences for MediaStream
INSERT INTO public.prpc_inferences (
  customer_id, prpc_id, product_name, rate_plan_name, charge_name,
  inferred_product_category, inferred_pob, rationale, confidence, source_agent, status
)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'PRPC-2001', 'Content Streaming', 'Per-Stream Plan', 'Stream Count Fee',
   'Streaming Rights', 'Usage-Based', 'Revenue tied directly to number of streams delivered. The per-stream pricing model indicates usage-based recognition as content is consumed.', 0.91, 'agent_1b', 'inferred'),
  ('22222222-2222-2222-2222-222222222222', 'PRPC-2002', 'Premium Library Access', 'Monthly Subscription', 'Library Access Fee',
   'Content Library', 'Subscription', 'Flat monthly fee for unlimited content library access. Subscription-based stand-ready obligation where revenue is recognized over time.', 0.94, 'agent_1b', 'approved'),
  ('22222222-2222-2222-2222-222222222222', 'PRPC-2003', 'Content Licensing', 'Annual License', 'Content Rights Fee',
   'Streaming Rights', 'Subscription', 'Annual licensing fee for streaming rights. Despite being usage-related content, the annual fixed-fee structure suggests subscription POB.', 0.83, 'agent_1b', 'inferred');

-- Create PRPC inferences for FinServe
INSERT INTO public.prpc_inferences (
  customer_id, prpc_id, product_name, rate_plan_name, charge_name,
  inferred_product_category, inferred_pob, rationale, confidence, source_agent, status
)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'PRPC-3001', 'Payment Gateway', 'Transaction-Based', 'Processing Fee',
   'Transaction Processing', 'Usage-Based', 'Fee charged per transaction processed. Clear usage-based model where revenue recognition occurs as each transaction is completed.', 0.96, 'agent_1b', 'approved'),
  ('33333333-3333-3333-3333-333333333333', 'PRPC-3002', 'Compliance Platform', 'Monthly Subscription', 'Platform Access',
   'Compliance Services', 'Subscription', 'Monthly recurring fee for continuous access to compliance management platform. Subscription POB with revenue recognized ratably over subscription period.', 0.93, 'agent_1b', 'inferred'),
  ('33333333-3333-3333-3333-333333333333', 'PRPC-3003', 'Risk Analysis', 'Quarterly Service', 'Analysis Fee',
   'Compliance Services', 'Subscription', 'Quarterly recurring service fee. The regular cadence and service nature indicate subscription-based POB.', 0.88, 'agent_1b', 'inferred');

-- Create subscriptions for TechCorp
INSERT INTO public.subscriptions (
  id, customer_id, subscription_id, start_date, end_date,
  termed, evergreen, has_cancellation, has_ramps, has_discounts,
  billing_period, currency, status, audited
)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'SUB-TC-001', '2024-01-01', '2025-12-31',
   true, false, true, false, true, 'annual', 'USD', 'active', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', '11111111-1111-1111-1111-111111111111', 'SUB-TC-002', '2024-06-01', NULL,
   false, true, false, true, false, 'monthly', 'USD', 'active', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', '11111111-1111-1111-1111-111111111111', 'SUB-TC-003', '2024-03-15', '2024-09-15',
   true, false, false, false, false, 'quarterly', 'USD', 'expired', false);

-- Create subscriptions for MediaStream
INSERT INTO public.subscriptions (
  id, customer_id, subscription_id, start_date, end_date,
  termed, evergreen, has_cancellation, has_ramps, has_discounts,
  billing_period, currency, status, audited
)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba', '22222222-2222-2222-2222-222222222222', 'SUB-MS-001', '2024-02-01', NULL,
   false, true, true, false, false, 'monthly', 'USD', 'active', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'SUB-MS-002', '2024-01-15', '2026-01-15',
   true, false, false, true, true, 'annual', 'USD', 'active', true);

-- Create subscriptions for FinServe
INSERT INTO public.subscriptions (
  id, customer_id, subscription_id, start_date, end_date,
  termed, evergreen, has_cancellation, has_ramps, has_discounts,
  billing_period, currency, status, audited
)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', '33333333-3333-3333-3333-333333333333', 'SUB-FS-001', '2024-01-01', '2024-12-31',
   true, false, true, false, false, 'monthly', 'USD', 'active', true),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', '33333333-3333-3333-3333-333333333333', 'SUB-FS-002', '2024-04-01', NULL,
   false, true, false, false, true, 'quarterly', 'USD', 'active', false);

-- Create subscription coverage candidates for TechCorp
INSERT INTO public.subscription_coverage_candidates (
  customer_id, subscription_id,
  covers_product_categories, covers_attributes,
  is_in_minimal_set, rationale, confidence
)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   ARRAY['SaaS Licenses', 'Professional Services'], ARRAY['termed', 'cancellation', 'discounts'],
   true, 'Primary subscription covering core SaaS licenses and professional services. Includes termed structure with cancellation provisions and volume discounts, representing key contract patterns.', 0.92),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
   ARRAY['Support & Maintenance', 'SaaS Licenses'], ARRAY['evergreen', 'ramps'],
   true, 'Evergreen subscription with ramping fee structure. Covers support services and additional license capacity, demonstrating expansion revenue patterns.', 0.88);

-- Create subscription coverage candidates for MediaStream
INSERT INTO public.subscription_coverage_candidates (
  customer_id, subscription_id,
  covers_product_categories, covers_attributes,
  is_in_minimal_set, rationale, confidence
)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
   ARRAY['Content Library', 'Streaming Rights'], ARRAY['evergreen', 'cancellation'],
   true, 'Evergreen subscription model with month-to-month cancellation. Covers both library access and streaming rights, representing core product offerings.', 0.90),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   ARRAY['Streaming Rights'], ARRAY['termed', 'ramps', 'discounts'],
   true, 'Multi-year termed contract with usage ramps and volume discounts. Critical for testing complex pricing structures and revenue recognition patterns.', 0.85);

-- Create subscription coverage candidates for FinServe
INSERT INTO public.subscription_coverage_candidates (
  customer_id, subscription_id,
  covers_product_categories, covers_attributes,
  is_in_minimal_set, rationale, confidence
)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
   ARRAY['Transaction Processing', 'Compliance Services'], ARRAY['termed', 'cancellation'],
   true, 'Termed annual contract covering both transaction processing and compliance services. Includes cancellation terms, representing standard enterprise contract structure.', 0.94);
