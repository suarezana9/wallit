import { useColorScheme } from 'react-native';
import { usePreferencesStore } from '@/store/preferencesStore';

export const LightTheme = {
  // Fondos
  bg:           '#F4F0E8',
  surface:      '#FFFFFF',
  surfaceAlt:   'rgba(26,53,38,0.05)',

  // Primario (verde bosque)
  primary:      '#1A3526',
  primaryMid:   '#2D6A4F',

  // Acento (gold)
  accent:       '#B8911E',
  accentLight:  '#D4A843',
  accentBg:     'rgba(184,145,30,0.10)',
  accentBorder: 'rgba(184,145,30,0.22)',
  accentText:   '#6B4A0C',

  // Texto
  text:         '#1A3526',
  textSecondary:'rgba(26,53,38,0.55)',
  textMuted:    'rgba(26,53,38,0.32)',

  // Bordes
  border:       'rgba(26,53,38,0.09)',
  borderStrong: 'rgba(26,53,38,0.16)',

  // Semánticos
  positive:     '#2D6A4F',
  negative:     '#B91C1C',
  positiveText: '#2D6A4F',
  negativeText: '#B91C1C',

  // Tarjeta hero (dark green)
  heroBg:           '#1A3526',
  heroText:         '#F4F0E8',
  heroTextMuted:    'rgba(244,240,232,0.42)',
  heroSurface:      'rgba(244,240,232,0.06)',
  heroSurfaceBorder:'rgba(244,240,232,0.09)',
  heroAccent:       '#D4A843',
  heroNavArrow:     'rgba(244,240,232,0.75)',
  heroNavArrowOff:  'rgba(244,240,232,0.25)',

  // Chips
  chipActiveBg:     '#1A3526',
  chipActiveText:   '#F4F0E8',
  chipInactiveBg:   'rgba(26,53,38,0.06)',
  chipInactiveBorder:'rgba(26,53,38,0.12)',
  chipInactiveText: 'rgba(26,53,38,0.50)',

  // Tab bar
  tabBarBg:         '#FFFFFF',
  tabBarActive:     '#1A3526',
  tabBarInactive:   'rgba(26,53,38,0.32)',
  tabBarBorder:     'rgba(26,53,38,0.08)',

  // Badge grupo
  badgeGrupoBg:     'rgba(26,53,38,0.08)',
  badgeGrupoText:   '#1A3526',

  // Colores semánticos por tipo de movimiento
  tipoIngreso:   '#2D6A4F',
  tipoAhorro:    '#1D4ED8',
  tipoInversion: '#B8911E',

  // Flag de modo
  isDark: false,
} as const;

export const DarkTheme = {
  // Fondos
  bg:           '#0C0B18',
  surface:      '#1A1630',
  surfaceAlt:   'rgba(255,255,255,0.05)',

  // Primario (índigo)
  primary:      '#7C5CFF',
  primaryMid:   '#A78BFA',

  // Acento (violeta)
  accent:       '#A78BFA',
  accentLight:  '#C4B5FD',
  accentBg:     'rgba(124,92,255,0.14)',
  accentBorder: 'rgba(124,92,255,0.28)',
  accentText:   '#C4B5FD',

  // Texto
  text:         '#F0EDE8',
  textSecondary:'rgba(240,237,232,0.55)',
  textMuted:    'rgba(240,237,232,0.30)',

  // Bordes
  border:       'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  // Semánticos
  positive:     '#4ADE80',
  negative:     '#F87171',
  positiveText: '#4ADE80',
  negativeText: '#F87171',

  // Tarjeta hero (dark indigo card)
  heroBg:           '#1A1630',
  heroText:         '#F0EDE8',
  heroTextMuted:    'rgba(240,237,232,0.38)',
  heroSurface:      'rgba(255,255,255,0.05)',
  heroSurfaceBorder:'rgba(255,255,255,0.08)',
  heroAccent:       '#A78BFA',
  heroNavArrow:     'rgba(255,255,255,0.72)',
  heroNavArrowOff:  'rgba(255,255,255,0.20)',

  // Chips
  chipActiveBg:     'rgba(124,92,255,0.22)',
  chipActiveText:   '#A78BFA',
  chipInactiveBg:   'rgba(255,255,255,0.04)',
  chipInactiveBorder:'rgba(255,255,255,0.09)',
  chipInactiveText: 'rgba(255,255,255,0.38)',

  // Tab bar
  tabBarBg:         '#0C0B18',
  tabBarActive:     '#A78BFA',
  tabBarInactive:   'rgba(255,255,255,0.28)',
  tabBarBorder:     'rgba(255,255,255,0.07)',

  // Badge grupo
  badgeGrupoBg:     'rgba(124,92,255,0.18)',
  badgeGrupoText:   '#A78BFA',

  // Colores semánticos por tipo de movimiento
  tipoIngreso:   '#4ADE80',
  tipoAhorro:    '#60A5FA',
  tipoInversion: '#F59E0B',

  // Flag de modo
  isDark: true,
} as const;

export type Theme = typeof LightTheme;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const tema = usePreferencesStore((s) => s.tema);
  const useDark = tema === 'system' ? scheme === 'dark' : tema === 'dark';
  return useDark ? DarkTheme : LightTheme;
}
