import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { type CodigoMoneda, MONEDA_POR_DEFECTO, detectarMonedaPorRegion } from '@/constants/monedas';

export type Tema = 'system' | 'light' | 'dark';
export type Idioma = 'es' | 'en';

const KEY_TEMA   = 'wallit_tema';
const KEY_MONEDA = 'wallit_moneda';
const KEY_IDIOMA = 'wallit_idioma';

interface PreferencesState {
  tema: Tema;
  moneda: CodigoMoneda;
  idioma: Idioma;
  setTema:   (tema: Tema) => Promise<void>;
  setMoneda: (moneda: CodigoMoneda) => Promise<void>;
  setIdioma: (idioma: Idioma) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  tema: 'system',
  moneda: MONEDA_POR_DEFECTO,
  idioma: 'es',
  setTema: async (tema) => {
    set({ tema });
    await AsyncStorage.setItem(KEY_TEMA, tema);
  },
  setMoneda: async (moneda) => {
    set({ moneda });
    await AsyncStorage.setItem(KEY_MONEDA, moneda);
  },
  setIdioma: async (idioma) => {
    set({ idioma });
    await AsyncStorage.setItem(KEY_IDIOMA, idioma);
  },
}));

// Carga preferencias al arrancar; detecta moneda por región e idioma por languageTag
AsyncStorage.multiGet([KEY_TEMA, KEY_MONEDA, KEY_IDIOMA]).then(([[, tema], [, moneda], [, idioma]]) => {
  const firstLocale = Localization.getLocales()[0];
  const regionCode  = firstLocale?.regionCode ?? '';
  const languageTag = firstLocale?.languageTag ?? 'es-AR';
  const updates: Partial<PreferencesState> = {};

  if (tema === 'light' || tema === 'dark' || tema === 'system') updates.tema = tema;

  // Moneda: usa regionCode del dispositivo (independiente del idioma configurado)
  updates.moneda = moneda ? (moneda as CodigoMoneda) : detectarMonedaPorRegion(regionCode);

  // Idioma: usa el idioma del dispositivo (languageTag), no la región
  if (idioma === 'es' || idioma === 'en') {
    updates.idioma = idioma;
  } else {
    updates.idioma = languageTag.startsWith('en') ? 'en' : 'es';
  }

  usePreferencesStore.setState(updates);
});
