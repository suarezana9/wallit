import { create } from 'zustand';
import type { Database } from '@/types/database';

type Gasto = Database['public']['Tables']['expenses']['Row'];
type Grupo = Database['public']['Tables']['groups']['Row'];

interface GastoState {
  gastos: Gasto[];
  grupoActual: Grupo | null;
  cargando: boolean;
  setGastos: (gastos: Gasto[]) => void;
  agregarGasto: (gasto: Gasto) => void;
  setGrupoActual: (grupo: Grupo | null) => void;
  setCargando: (cargando: boolean) => void;
}

export const useGastoStore = create<GastoState>((set) => ({
  gastos: [],
  grupoActual: null,
  cargando: false,

  setGastos: (gastos) => set({ gastos }),
  agregarGasto: (gasto) => set((state) => ({ gastos: [gasto, ...state.gastos] })),
  setGrupoActual: (grupoActual) => set({ grupoActual }),
  setCargando: (cargando) => set({ cargando }),
}));
