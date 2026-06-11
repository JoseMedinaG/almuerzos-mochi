
-- Lock down app_config: hide vapid_keys from public reads
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;
DROP POLICY IF EXISTS "Public can read non-sensitive app config" ON public.app_config;

CREATE POLICY "Public can read non-sensitive app config"
ON public.app_config
FOR SELECT
USING (key <> 'vapid_keys');

CREATE POLICY "Admins can read all app config"
ON public.app_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lock down push_subscriptions: remove public SELECT/DELETE
DROP POLICY IF EXISTS "Anyone can insert push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;

-- Allow anyone (including unauthenticated) to register their own subscription
CREATE POLICY "Anyone can insert push subscription"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Only admins can view/delete (edge functions use service_role and bypass RLS)
CREATE POLICY "Admins can view push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
