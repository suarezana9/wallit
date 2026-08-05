import { create } from 'zustand';
import type { TipoMovimiento } from '@/types/database';

interface NuevoMovimientoState {
  isOpen: boolean;
  tipoInicial: TipoMovimiento;
  abrir: (tipo?: TipoMovimiento) => void;
  cerrar: () => void;
}

export const useNuevoMovimientoStore = create<NuevoMovimientoState>((set) => ({
  isOpen: false,
  tipoInicial: 'gasto',
  abrir: (tipo = 'gasto') => set({ isOpen: true, tipoInicial: tipo }),
  cerrar: () => set({ isOpen: false }),
}));
