-- =====================================================
-- Migración 010: Triggers para notificaciones de grupo en tiempo real
-- Requiere: extensión pg_net habilitada en Supabase
-- =====================================================

-- ── Función auxiliar que llama a la Edge Function via pg_net ──────────────

CREATE OR REPLACE FUNCTION public.llamar_notificar_grupo(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://aqwvhernxswfpwzqzcxa.supabase.co/functions/v1/notificar-grupo',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd3ZoZXJueHN3ZnB3enF6Y3hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM1ODc3NiwiZXhwIjoyMDk4OTM0Nzc2fQ.ojHZQnG1xmbtpPzg9EFSPvRv4bAFwz-KoNfxKwIizBw'
    ),
    body    := payload
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- no romper la transacción principal si la notif falla
END;
$$;

-- ── Trigger 1: Nuevo miembro en un grupo ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_notif_nuevo_miembro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_name text;
  v_group_name text;
BEGIN
  SELECT name INTO v_actor_name FROM public.users  WHERE id = NEW.user_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;

  PERFORM public.llamar_notificar_grupo(
    jsonb_build_object(
      'evento',      'nuevo_miembro',
      'group_id',    NEW.group_id,
      'actor_id',    NEW.user_id,
      'actor_name',  COALESCE(v_actor_name, 'Alguien'),
      'group_name',  COALESCE(v_group_name, 'el grupo')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notif_nuevo_miembro ON public.group_members;
CREATE TRIGGER notif_nuevo_miembro
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notif_nuevo_miembro();

-- ── Trigger 2: Nuevo gasto/ingreso en un grupo ────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_notif_nuevo_gasto_grupo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_name text;
  v_group_name text;
BEGIN
  IF NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_actor_name FROM public.users  WHERE id = NEW.user_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;

  PERFORM public.llamar_notificar_grupo(
    jsonb_build_object(
      'evento',      'nuevo_gasto',
      'group_id',    NEW.group_id,
      'actor_id',    NEW.user_id,
      'actor_name',  COALESCE(v_actor_name, 'Alguien'),
      'group_name',  COALESCE(v_group_name, 'el grupo'),
      'monto',       NEW.amount,
      'descripcion', NEW.description,
      'categoria',   NEW.category,
      'tipo',        COALESCE(NEW.tipo, 'gasto')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notif_nuevo_gasto_grupo ON public.expenses;
CREATE TRIGGER notif_nuevo_gasto_grupo
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notif_nuevo_gasto_grupo();
