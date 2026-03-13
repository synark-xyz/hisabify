ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS pro_access_override BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.users.pro_access_override IS
'Manual super-admin override for premium access. TRUE forces Pro on, FALSE forces Pro off, NULL falls back to normal subscription logic.';
