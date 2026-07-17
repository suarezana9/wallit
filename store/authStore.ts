import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  usuario: User | null;
  cargando: boolean;
  setSession: (session: Session | null) => void;
  setUsuario: (usuario: User | null) => void;
  setCargando: (cargando: boolean) => void;
  cerrarSesion: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  usuario: null,
  cargando: true,

  setSession: (session) => set({ session, usuario: session?.user ?? null }),
  setUsuario: (usuario) => set({ usuario }),
  setCargando: (cargando) => set({ cargando }),
  cerrarSesion: () => set({ session: null, usuario: null }),
}));
