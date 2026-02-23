
-- Push subscriptions table to store device push endpoints
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (app doesn't require auth for ordering)
CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions FOR INSERT WITH CHECK (true);

-- Only service role (edge function) reads subscriptions for sending
CREATE POLICY "Anyone can read push subscriptions"
ON public.push_subscriptions FOR SELECT USING (true);

-- Allow deleting (unsubscribe)
CREATE POLICY "Anyone can delete push subscriptions"
ON public.push_subscriptions FOR DELETE USING (true);

-- App config table for storing VAPID keys
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (frontend needs VAPID public key)
CREATE POLICY "Anyone can read app config"
ON public.app_config FOR SELECT USING (true);
