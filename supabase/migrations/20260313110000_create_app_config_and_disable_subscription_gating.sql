CREATE TABLE IF NOT EXISTS public.app_config (
  id TEXT PRIMARY KEY,
  disable_subscription_gating BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton_check CHECK (id = 'global')
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
USING (true);

INSERT INTO public.app_config (id, disable_subscription_gating)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_app_config_updated_at ON public.app_config;
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.app_config IS
'Singleton application-level runtime configuration.';

COMMENT ON COLUMN public.app_config.disable_subscription_gating IS
'When true, all premium feature guards are disabled and all users behave as Pro.';
