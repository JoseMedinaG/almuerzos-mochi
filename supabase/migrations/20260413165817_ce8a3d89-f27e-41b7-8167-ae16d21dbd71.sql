
-- Add ON DELETE CASCADE to menu_items -> daily_menus FK
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_menu_id_fkey,
  ADD CONSTRAINT menu_items_menu_id_fkey
    FOREIGN KEY (menu_id) REFERENCES public.daily_menus(id) ON DELETE CASCADE;

-- Add ON DELETE CASCADE to orders -> daily_menus FK
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_menu_id_fkey,
  ADD CONSTRAINT orders_menu_id_fkey
    FOREIGN KEY (menu_id) REFERENCES public.daily_menus(id) ON DELETE CASCADE;

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleting daily_menus will cascade to menu_items and orders
  DELETE FROM public.daily_menus
  WHERE date < (CURRENT_DATE - INTERVAL '15 days');
  
  -- Also clean old app_config raffle winners older than 15 days
  DELETE FROM public.app_config
  WHERE key = 'nequi_raffle_winner'
    AND (value->>'date')::date < (CURRENT_DATE - INTERVAL '15 days');
END;
$$;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-data',
  '0 3 * * *',
  $$SELECT public.cleanup_old_data()$$
);
