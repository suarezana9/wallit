-- =====================================================
-- Migración 007: RPC para obtener push_token del admin de un grupo
-- Ejecutar en Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION public.obtener_admin_push_token(p_group_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.push_token
  FROM public.group_members gm
  JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND gm.role = 'admin'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_admin_push_token(uuid) TO authenticated;
