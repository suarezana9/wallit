-- Migración 009: rediseño de presupuestos
-- De "un límite por categoría" a "presupuestos con nombre que agrupan categorías".

-- 1. Eliminar índices únicos anteriores (referenciaban category)
DROP INDEX IF EXISTS budgets_grupo_unico;
DROP INDEX IF EXISTS budgets_personal_unico;

-- 2. Eliminar columna category
ALTER TABLE public.budgets DROP COLUMN IF EXISTS category;

-- 3. Agregar nombre y lista de categorías
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

-- 4. Índices únicos: un presupuesto con el mismo nombre no puede repetirse en el mismo mes y contexto
CREATE UNIQUE INDEX IF NOT EXISTS budgets_grupo_nombre_mes
  ON public.budgets (group_id, name, month)
  WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_personal_nombre_mes
  ON public.budgets (user_id, name, month)
  WHERE user_id IS NOT NULL AND group_id IS NULL;

-- Las RLS policies (select/insert/update/delete) de la migración 008 siguen vigentes.
