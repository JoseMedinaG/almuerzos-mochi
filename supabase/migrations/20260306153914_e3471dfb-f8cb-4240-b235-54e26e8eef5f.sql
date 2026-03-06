
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can upsert app config" ON public.app_config;
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;

CREATE POLICY "Anyone can read app config"
ON public.app_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can upsert app config"
ON public.app_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
