-- Migración 008: soporte de presupuestos personales (sin grupo)
-- Hace group_id nullable y agrega user_id para poder crear límites en contexto personal.

-- 1. Hacer group_id opcional
ALTER TABLE public.budgets ALTER COLUMN group_id DROP NOT NULL;

-- 2. Agregar user_id (para presupuestos personales)
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS user_id uuid references public.users(id) on delete cascade;

-- 3. Restricción: al menos uno de los dos debe estar presente
ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_contexto_check
  CHECK (group_id IS NOT NULL OR user_id IS NOT NULL);

-- 4. Eliminar la unique constraint original (que requería group_id NOT NULL)
ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_group_id_category_month_key;

-- 5. Índices únicos parciales que cubren ambos casos
CREATE UNIQUE INDEX IF NOT EXISTS budgets_grupo_unico
  ON public.budgets (group_id, category, month)
  WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_personal_unico
  ON public.budgets (user_id, category, month)
  WHERE user_id IS NOT NULL AND group_id IS NULL;

-- 6. Actualizar RLS

-- Select: ver propios presupuestos personales O los del grupo del que eres miembro
DROP POLICY IF EXISTS "presupuestos_select" ON public.budgets;
CREATE POLICY "presupuestos_select" ON public.budgets
  FOR SELECT USING (
    (user_id = (select auth.uid()) AND group_id IS NULL)
    OR
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = (select auth.uid())
    )
  );

-- Insert personal: cualquier usuario para sus propios presupuestos
DROP POLICY IF EXISTS "presupuestos_insert" ON public.budgets;
CREATE POLICY "presupuestos_insert" ON public.budgets
  FOR INSERT WITH CHECK (
    (user_id = (select auth.uid()) AND group_id IS NULL)
    OR
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = (select auth.uid()) and role = 'admin'
    )
  );

-- Update: mismo criterio que insert
CREATE POLICY "presupuestos_update" ON public.budgets
  FOR UPDATE USING (
    (user_id = (select auth.uid()) AND group_id IS NULL)
    OR
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = (select auth.uid()) and role = 'admin'
    )
  );

-- Delete: mismo criterio
CREATE POLICY "presupuestos_delete" ON public.budgets
  FOR DELETE USING (
    (user_id = (select auth.uid()) AND group_id IS NULL)
    OR
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = (select auth.uid()) and role = 'admin'
    )
  );
