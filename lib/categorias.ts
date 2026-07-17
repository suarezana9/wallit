export interface CategoriaPersonalizada {
  id: string;
  nombre: string;
  emoji: string;
  color: string;
}

export interface CategoriaConfig {
  ocultas: string[];
  personalizadas: CategoriaPersonalizada[];
}

export interface InfoCategoria {
  nombre: string;
  emoji: string;
  color: string;
}

export const CATEGORIAS_BUILTIN: InfoCategoria[] = [
  { nombre: 'Supermercado',  emoji: '🛒', color: '#10B981' },
  { nombre: 'Servicios',     emoji: '💡', color: '#3B82F6' },
  { nombre: 'Transporte',    emoji: '🚌', color: '#F59E0B' },
  { nombre: 'Salud',         emoji: '❤️', color: '#EF4444' },
  { nombre: 'Educación',     emoji: '📚', color: '#8B5CF6' },
  { nombre: 'Ocio',          emoji: '🎬', color: '#EC4899' },
  { nombre: 'Restaurantes',  emoji: '🍽️', color: '#F97316' },
  { nombre: 'Ropa',          emoji: '👕', color: '#06B6D4' },
  { nombre: 'Tecnología',    emoji: '💻', color: '#6366F1' },
  { nombre: 'Hogar',         emoji: '🏠', color: '#84CC16' },
  { nombre: 'Mascotas',      emoji: '🐾', color: '#A78BFA' },
  { nombre: 'Viajes',        emoji: '✈️', color: '#0EA5E9' },
  { nombre: 'Suscripciones', emoji: '📺', color: '#7C3AED' },
  { nombre: 'Deporte',       emoji: '🏋️', color: '#059669' },
  { nombre: 'Belleza',       emoji: '💄', color: '#DB2777' },
  { nombre: 'Auto',          emoji: '🚗', color: '#D97706' },
  { nombre: 'Farmacia',      emoji: '💊', color: '#DC2626' },
  { nombre: 'Regalos',       emoji: '🎁', color: '#9333EA' },
  { nombre: 'Delivery',      emoji: '🛵', color: '#EA580C' },
  { nombre: 'Bar',           emoji: '☕', color: '#92400E' },
  { nombre: 'Banco',         emoji: '🏦', color: '#1D4ED8' },
  { nombre: 'Trabajo',       emoji: '💼', color: '#374151' },
  { nombre: 'Otros',         emoji: '📦', color: '#9CA3AF' },
];

// Mapa estático para lookup O(1)
const COLOR_MAP: Record<string, string> = {};
const EMOJI_MAP: Record<string, string> = {};
for (const c of CATEGORIAS_BUILTIN) {
  COLOR_MAP[c.nombre] = c.color;
  EMOJI_MAP[c.nombre] = c.emoji;
}

// Para compatibilidad con imports existentes en lib/gastos.ts
export const COLORES_CATEGORIA: Record<string, string> = COLOR_MAP;
export const EMOJIS_CATEGORIA: Record<string, string> = EMOJI_MAP;

export function getCategoriaColor(nombre: string, config?: CategoriaConfig | null): string {
  if (COLOR_MAP[nombre]) return COLOR_MAP[nombre];
  const custom = config?.personalizadas.find((p) => p.nombre === nombre);
  return custom?.color ?? '#9CA3AF';
}

export function getCategoriaEmoji(nombre: string, config?: CategoriaConfig | null): string {
  if (EMOJI_MAP[nombre]) return EMOJI_MAP[nombre];
  const custom = config?.personalizadas.find((p) => p.nombre === nombre);
  return custom?.emoji ?? '📦';
}

export function getCategoriaVisibles(config: CategoriaConfig | null): string[] {
  const ocultas = new Set(config?.ocultas ?? []);
  const builtin = CATEGORIAS_BUILTIN
    .filter((c) => !ocultas.has(c.nombre))
    .map((c) => c.nombre);
  const personalizadas = (config?.personalizadas ?? []).map((p) => p.nombre);
  return [...builtin, ...personalizadas];
}

export const EMOJIS_PICKER = [
  '🏷️','🎯','🎮','🧘','🍺','🧁','🌿','🏖️','🎸','💈',
  '🛠️','🚀','🎓','🌙','🧠','🐶','🐱','🌺','⚽','🎨',
  '📷','🎪','🏄','🎻','🍀','🦋','🔑','💎','🌈','🎁',
];

export const COLORES_PICKER = [
  '#EF4444','#F97316','#EAB308','#84CC16',
  '#10B981','#06B6D4','#3B82F6','#6366F1',
  '#8B5CF6','#EC4899','#374151','#92400E',
];
