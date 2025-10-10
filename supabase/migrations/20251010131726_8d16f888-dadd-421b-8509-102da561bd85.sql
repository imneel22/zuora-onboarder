-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'standard');

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zuora_account_id text NOT NULL UNIQUE,
  assigned_user_ids uuid[] NOT NULL DEFAULT '{}',
  industry text,
  go_live_target_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'onboarding', 'completed', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create product_category_catalog table
CREATE TABLE public.product_category_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  pob_name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, category_name, pob_name)
);

ALTER TABLE public.product_category_catalog ENABLE ROW LEVEL SECURITY;

-- Create prpc_inferences table
CREATE TABLE public.prpc_inferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  prpc_id text NOT NULL,
  product_name text NOT NULL,
  rate_plan_name text NOT NULL,
  charge_name text NOT NULL,
  inferred_product_category text,
  inferred_pob text,
  rationale text,
  confidence decimal(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  source_agent text,
  last_reviewed_by uuid REFERENCES public.profiles(id),
  last_reviewed_at timestamptz,
  status text NOT NULL DEFAULT 'inferred' CHECK (status IN ('inferred', 'user_adjusted', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, prpc_id)
);

ALTER TABLE public.prpc_inferences ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  subscription_id text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  termed boolean NOT NULL DEFAULT false,
  evergreen boolean NOT NULL DEFAULT false,
  has_cancellation boolean NOT NULL DEFAULT false,
  has_ramps boolean NOT NULL DEFAULT false,
  has_discounts boolean NOT NULL DEFAULT false,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'annual', 'one_time')),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  audited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, subscription_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create subscription_coverage_candidates table
CREATE TABLE public.subscription_coverage_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  covers_product_categories text[] NOT NULL DEFAULT '{}',
  covers_attributes text[] NOT NULL DEFAULT '{}',
  is_in_minimal_set boolean NOT NULL DEFAULT false,
  rationale text,
  confidence decimal(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, subscription_id)
);

ALTER TABLE public.subscription_coverage_candidates ENABLE ROW LEVEL SECURITY;

-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('customer', 'prpc_inference', 'subscription', 'coverage_candidate', 'product_category')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'approve', 'reject', 'reclassify')),
  before_json jsonb,
  after_json jsonb,
  actor uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Give first user admin role, others get standard
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'standard');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_category_catalog_updated_at
  BEFORE UPDATE ON public.product_category_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prpc_inferences_updated_at
  BEFORE UPDATE ON public.prpc_inferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_coverage_candidates_updated_at
  BEFORE UPDATE ON public.subscription_coverage_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for customers
CREATE POLICY "Admins can view all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view assigned customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(assigned_user_ids));

CREATE POLICY "Admins can manage customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_category_catalog
CREATE POLICY "Admins can view all categories"
  ON public.product_category_catalog FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view categories for assigned customers"
  ON public.product_category_catalog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = product_category_catalog.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Admins can manage categories"
  ON public.product_category_catalog FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can suggest category changes"
  ON public.product_category_catalog FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = product_category_catalog.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

-- RLS Policies for prpc_inferences
CREATE POLICY "Admins can view all inferences"
  ON public.prpc_inferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view inferences for assigned customers"
  ON public.prpc_inferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = prpc_inferences.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Users can update inferences for assigned customers"
  ON public.prpc_inferences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = prpc_inferences.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Admins can manage inferences"
  ON public.prpc_inferences FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view subscriptions for assigned customers"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = subscriptions.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Users can update subscriptions for assigned customers"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = subscriptions.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subscription_coverage_candidates
CREATE POLICY "Admins can view all coverage candidates"
  ON public.subscription_coverage_candidates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view coverage for assigned customers"
  ON public.subscription_coverage_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = subscription_coverage_candidates.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Users can update coverage for assigned customers"
  ON public.subscription_coverage_candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = subscription_coverage_candidates.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "Admins can manage coverage candidates"
  ON public.subscription_coverage_candidates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for audit_log
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Standard users can view audit logs for assigned customers"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = audit_log.customer_id
      AND auth.uid() = ANY(customers.assigned_user_ids)
    )
  );

CREATE POLICY "All users can create audit logs"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor = auth.uid());