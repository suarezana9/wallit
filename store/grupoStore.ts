import { create } from 'zustand';
import type { Database } from '@/types/database';

type Grupo = Database['public']['Tables']['groups']['Row'];

export interface GrupoConRol {
  grupo: Grupo;
  rol: 'admin' | 'member';
}

interface GrupoState {
  grupos: GrupoConRol[];
  grupoActivo: Grupo | null;
  rolEnGrupo: 'admin' | 'member' | null;
  contextoId: 'personal' | string;
  setGrupos: (grupos: GrupoConRol[]) => void;
  setGrupoActivo: (grupo: Grupo | null) => void;
  setContexto: (id: 'personal' | string) => void;
  limpiarGrupos: () => void;
}

export const useGrupoStore = create<GrupoState>((set, get) => ({
  grupos: [],
  grupoActivo: null,
  rolEnGrupo: null,
  contextoId: 'personal',

  setGrupos: (grupos) => {
    const { contextoId } = get();
    // Mantener el contexto actual si el grupo sigue existiendo; si no, volver a personal
    const grupoDelContexto = contextoId !== 'personal'
      ? grupos.find((g) => g.grupo.id === contextoId) ?? null
      : null;
    set({
      grupos,
      grupoActivo: grupoDelContexto?.grupo ?? null,
      rolEnGrupo: grupoDelContexto?.rol ?? null,
    });
  },

  setGrupoActivo: (grupo) => {
    const { grupos } = get();
    const encontrado = grupos.find((g) => g.grupo.id === grupo?.id);
    set({ grupoActivo: grupo, rolEnGrupo: encontrado?.rol ?? null });
  },

  setContexto: (id) => {
    const { grupos } = get();
    if (id === 'personal') {
      set({ contextoId: 'personal', grupoActivo: null, rolEnGrupo: null });
    } else {
      const encontrado = grupos.find((g) => g.grupo.id === id);
      if (encontrado) {
        set({ contextoId: id, grupoActivo: encontrado.grupo, rolEnGrupo: encontrado.rol });
      }
    }
  },

  limpiarGrupos: () => set({ grupos: [], grupoActivo: null, rolEnGrupo: null, contextoId: 'personal' }),
}));
