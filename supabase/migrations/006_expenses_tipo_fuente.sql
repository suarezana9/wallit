-- =====================================================
-- Migración 006: expenses + tipo, fuente, categorías libres
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar el CHECK viejo de category (solo 10 categorías hardcodeadas)
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 2. Agregar columna tipo (gasto | ingreso | ahorro | inversion)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'gasto'
    CHECK (tipo IN ('gasto', 'ingreso', 'ahorro', 'inversion'));

-- 3. Agregar columna fuente (para ingresos: sueldo | freelance | alquiler | otro)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS fuente text
    CHECK (fuente IS NULL OR fuente IN ('sueldo', 'freelance', 'alquiler', 'otro'));

-- 4. Hacer group_id nullable (gastos personales no tienen grupo)
ALTER TABLE public.expenses
  ALTER COLUMN group_id DROP NOT NULL;

-- 5. Actualizar política RLS para gastos personales (group_id IS NULL)
DROP POLICY IF EXISTS "gastos_select" ON public.expenses;
CREATE POLICY "gastos_select" ON public.expenses
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = expenses.group_id AND user_id = auth.uid()
      )
      AND (is_private = false OR user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "gastos_insert" ON public.expenses;
CREATE POLICY "gastos_insert" ON public.expenses
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = expenses.group_id AND user_id = auth.uid()
      )
    )
  );

-- 6. categoria_config en users (si no se ejecutó la migración 005)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS categoria_config jsonb DEFAULT NULL;

-- 7. notif_config y push_token en users (si no se ejecutó la migración 004)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notif_config jsonb DEFAULT NULL;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token text DEFAULT NULL;
