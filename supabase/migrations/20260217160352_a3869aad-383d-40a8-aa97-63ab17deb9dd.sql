
-- Drop the overly permissive policy and replace with one that requires customer_name
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (customer_name IS NOT NULL AND customer_name != '');
