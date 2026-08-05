import { usePreferencesStore } from '@/store/preferencesStore';
import es from '@/constants/i18n/es';
import en from '@/constants/i18n/en';

const traducciones = { es, en };

export function useT() {
  const idioma = usePreferencesStore((s) => s.idioma);
  return traducciones[idioma];
}
