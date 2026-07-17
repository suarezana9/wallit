-- Fase 8: configuración de categorías por usuario
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS categoria_config jsonb DEFAULT NULL;

-- NULL = usa todas las predeterminadas (comportamiento por defecto)
-- Estructura: { "ocultas": ["Tecnología"], "personalizadas": [{ "id": "...", "nombre": "...", "emoji": "...", "color": "..." }] }
