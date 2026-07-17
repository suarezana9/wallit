import { create } from 'zustand';
import type { CategoriaConfig } from '@/lib/categorias';

interface CategoriaState {
  config: CategoriaConfig | null;
  setConfig: (config: CategoriaConfig) => void;
}

export const useCategoriaStore = create<CategoriaState>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
}));
