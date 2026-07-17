import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useGrupoStore } from '@/store/grupoStore';
import { obtenerMisGrupos, obtenerMiembros } from '@/lib/grupos';

export function useGrupo() {
  const usuario = useAuthStore((s) => s.usuario);
  const { grupos, grupoActivo, rolEnGrupo, contextoId, setGrupos, setGrupoActivo, setContexto } = useGrupoStore();
  const [miembros, setMiembros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const data = await obtenerMisGrupos(usuario.id);
      const gruposConRol = data
        .filter((d) => d.groups)
        .map((d) => ({
          grupo: Array.isArray(d.groups) ? d.groups[0] : d.groups,
          rol: d.role as 'admin' | 'member',
        }));

      setGrupos(gruposConRol as any);

      // Cargar miembros del grupo activo después de actualizar el store
      const activoId = useGrupoStore.getState().grupoActivo?.id;
      if (activoId) {
        const ms = await obtenerMiembros(activoId);
        setMiembros(ms ?? []);
      } else {
        setMiembros([]);
      }
    } catch {
      setGrupos([]);
      setMiembros([]);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  // Recargar miembros cuando cambia el grupo activo
  const cambiarGrupoActivo = useCallback(async (grupoId: string) => {
    const { grupos } = useGrupoStore.getState();
    const encontrado = grupos.find((g) => g.grupo.id === grupoId);
    if (!encontrado) return;
    setGrupoActivo(encontrado.grupo);
    try {
      const ms = await obtenerMiembros(grupoId);
      setMiembros(ms ?? []);
    } catch {
      setMiembros([]);
    }
  }, [setGrupoActivo]);

  useEffect(() => { cargar(); }, [cargar]);

  return { grupos, grupoActivo, rolEnGrupo, contextoId, setContexto, miembros, cargando, recargar: cargar, cambiarGrupoActivo };
}
